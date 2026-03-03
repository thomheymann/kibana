/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BoundInferenceClient, MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { isOtelStream } from '@kbn/streams-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ZodError } from '@kbn/zod';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema } from './schema';

export interface SuggestProcessingPipelineResult {
  pipeline: StreamlangDSL | null;
  metadata: {
    stepsUsed: number;
    maxSteps: number;
  };
}

export async function suggestProcessingPipeline({
  definition,
  inferenceClient,
  parsingProcessor,
  timeout,
  maxDurationMs,
  maxSteps,
  signal,
  simulatePipeline,
  documents,
  fieldsMetadataClient,
  esClient,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  parsingProcessor?: GrokProcessor | DissectProcessor;
  timeout?: number | undefined;
  maxDurationMs?: number | undefined;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  simulatePipeline(
    pipeline: StreamlangDSL,
    documents?: FlattenRecord[]
  ): Promise<ProcessingSimulationResponse>;
  documents: FlattenRecord[];
  fieldsMetadataClient: IFieldsMetadataClient;
  esClient: ElasticsearchClient;
}): Promise<SuggestProcessingPipelineResult> {
  const effectiveMaxSteps = maxSteps ?? 10;

  // No need to involve reasoning if there are no sample documents
  if (documents.length === 0) {
    return {
      pipeline: null,
      metadata: {
        stepsUsed: 0,
        maxSteps: effectiveMaxSteps,
      },
    };
  }

  // Collect metrics for the initial pipeline
  const isOtel = isOtelStream(definition);

  // Parallelize independent async operations
  const [mappedFields, simulationResult] = await Promise.all([
    getMappedFields(esClient, definition.name),
    simulatePipeline(
      addCustomIdentifiersToSteps({
        steps: parsingProcessor ? [parsingProcessor] : [],
      })
    ),
  ]);
  // When a parsing processor is provided, filter to only successfully parsed documents
  // so the LLM builds post-processing against clean, already-parsed data.
  let postParseDocuments: FlattenRecord[];
  let parsingCoverage: { parsed: number; total: number } | undefined;

  // Fields created by the parsing processor that have no index mapping — the LLM's
  // pipeline should either convert or remove these.
  let temporaryParsingFields: string[] = [];

  if (parsingProcessor) {
    const parsedDocs = simulationResult.documents.filter((doc) => doc.status === 'parsed');
    parsingCoverage = { parsed: parsedDocs.length, total: simulationResult.documents.length };
    postParseDocuments = parsedDocs.length > 0 ? parsedDocs.map((doc) => doc.value) : documents;

    temporaryParsingFields = simulationResult.detected_fields
      .filter(
        (f) =>
          !mappedFields[f.name] &&
          (f.name.startsWith('custom.') || f.name.startsWith('attributes.custom.'))
      )
      .map((f) => f.name);
  } else {
    postParseDocuments = documents;
  }

  // Compute metrics from the filtered post-parse documents by re-simulating
  // with an empty pipeline against the post-parse state
  const postParseSimulationResult = parsingProcessor
    ? await simulatePipeline(addCustomIdentifiersToSteps({ steps: [] }), postParseDocuments)
    : simulationResult;

  const initialFeedback = await buildSimulationFeedback(
    postParseSimulationResult,
    fieldsMetadataClient,
    isOtel,
    mappedFields,
    temporaryParsingFields
  );

  const input = {
    stream: definition,
    fields_schema: isOtel
      ? `OpenTelemetry (OTel) semantic convention for log records`
      : 'Elastic Common Schema (ECS)',
    pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(pipelineDefinitionSchema)),
    initial_dataset_analysis: JSON.stringify(initialFeedback),
    parsing_processor: parsingProcessor ? JSON.stringify(parsingProcessor) : undefined,
    parsing_processor_coverage: parsingCoverage
      ? `The parsing processor matched ${parsingCoverage.parsed} of ${parsingCoverage.total} documents. Only the matched documents are included below.`
      : undefined,
  };

  // Invoke the reasoning agent to suggest the ingest pipeline
  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input,
    timeout,
    maxDurationMs,
    maxSteps: effectiveMaxSteps,
    toolCallbacks: {
      simulate_pipeline: async (toolCall) => {
        // 1. Validate the pipeline schema
        const pipeline = pipelineDefinitionSchema.safeParse(toolCall.function.arguments.pipeline);
        if (!pipeline.success) {
          return {
            response: {
              valid: false,
              errors: formatZodPipelineErrors(pipeline.error, toolCall.function.arguments.pipeline),
              metrics: undefined,
            },
          };
        }

        // 2. Add customIdentifiers to steps for proper tracking in simulation results
        const pipelineWithIdentifiers = addCustomIdentifiersToSteps(pipeline.data as StreamlangDSL);

        // 3. Simulate the pipeline against post-parse documents
        const simulateResult = await simulatePipeline(pipelineWithIdentifiers, postParseDocuments);
        const feedback = await buildSimulationFeedback(
          simulateResult,
          fieldsMetadataClient,
          isOtel,
          mappedFields,
          temporaryParsingFields
        );

        return { response: feedback };
      },
      commit_pipeline: async (toolCall) => {
        const pipeline = pipelineDefinitionSchema.safeParse(toolCall.function.arguments.pipeline);
        if (!pipeline.success) {
          return {
            response: {
              committed: false,
              errors: pipeline.error.issues,
            },
          };
        }

        return {
          response: {
            committed: true,
            errors: undefined,
          },
        };
      },
    },
    finalToolChoice: {
      type: 'function',
      function: 'commit_pipeline',
    },
    abortSignal: signal,
  });

  // Count assistant messages to determine steps used
  const stepsUsed = response.input.filter(
    (message) => message.role === MessageRole.Assistant
  ).length;

  const metadata = {
    stepsUsed,
    maxSteps: effectiveMaxSteps,
  };

  // Check for empty toolCalls array (similar to #244335)
  if (!('toolCalls' in response) || response.toolCalls.length === 0) {
    throw new Error(
      i18n.translate('xpack.streams.ai.suggestProcessingPipeline.noToolCallsError', {
        defaultMessage:
          'Pipeline suggestions could not be generated from current log samples.\n\nTry fetching new sample data and re-running the suggestion.',
      })
    );
  }

  const commitPipeline = pipelineDefinitionSchema.safeParse(
    response.toolCalls[0].function.arguments.pipeline
  );
  if (!commitPipeline.success) {
    return {
      pipeline: null,
      metadata,
    };
  }

  // Stitch the parsing processor back as the first step if it was handled separately
  const fullPipeline: StreamlangDSL = {
    steps: [...(parsingProcessor ? [parsingProcessor] : []), ...commitPipeline.data.steps],
  };

  const pipelineWithIdentifiers = addCustomIdentifiersToSteps(fullPipeline);

  return {
    pipeline: pipelineWithIdentifiers,
    metadata,
  };
}

/**
 * Adds customIdentifier to each step in the pipeline for proper tracking.
 * This ensures processors are tracked correctly in simulation results.
 */
function addCustomIdentifiersToSteps(pipeline: StreamlangDSL): StreamlangDSL {
  return {
    ...pipeline,
    steps: pipeline.steps.map((step, index) => ({
      ...step,
      customIdentifier: step.customIdentifier || `${index}`,
    })),
  };
}

/**
 * Formats Zod validation errors for pipeline definitions by narrowing union
 * errors to the intended processor type based on the `action` field.
 * This avoids showing errors for all 6 union members when only 1 is relevant.
 */
function formatZodPipelineErrors(zodError: ZodError, rawPipeline: unknown): string[] {
  const steps = (rawPipeline as { steps?: unknown[] })?.steps;

  return zodError.issues.flatMap((issue) => {
    // For union errors on a step, try to match the intended processor type
    if (issue.code === 'invalid_union' && issue.path.length >= 2 && issue.path[0] === 'steps') {
      const stepIndex = issue.path[1] as number;
      const step = steps?.[stepIndex] as { action?: string } | undefined;
      const intendedAction = step?.action;

      if (intendedAction && 'unionErrors' in issue) {
        // Find the union member that matches the intended action
        const matchingUnionError = (issue.unionErrors as ZodError[]).find((ue) =>
          ue.issues.every(
            (ui) =>
              !('received' in ui && 'expected' in ui && ui.path.includes('action')) ||
              ui.expected === intendedAction
          )
        );

        if (matchingUnionError) {
          // Filter out the "wrong action" errors — only show property-level issues
          const propertyErrors = matchingUnionError.issues.filter(
            (ui) => !ui.path.includes('action')
          );

          if (propertyErrors.length > 0) {
            return propertyErrors.map(
              (ui) =>
                `Step ${stepIndex} (${intendedAction}): ${ui.path.slice(2).join('.')} — ${
                  ui.message
                }`
            );
          }
        }
      }
    }

    return [`${issue.path.join('.')}: ${issue.message}`];
  });
}

/**
 * Checks whether any temporary fields created by the parsing processor still exist
 * in the simulated output. These fields should have been removed or converted by
 * the LLM's pipeline.
 */
function findRemainingTemporaryFields(
  simulationResult: ProcessingSimulationResponse,
  temporaryFields: string[]
): string[] {
  if (temporaryFields.length === 0) {
    return [];
  }

  const fieldsStillPresent = new Set<string>();
  for (const doc of simulationResult.documents) {
    if (doc.value) {
      for (const field of temporaryFields) {
        if (field in doc.value) {
          fieldsStillPresent.add(field);
        }
      }
    }
  }

  return Array.from(fieldsStillPresent).map(
    (field) =>
      `Temporary field "${field}" was created by the parsing processor and is still present. Add a "remove" processor to clean it up, or use its value first (e.g., parse it with a "date" processor) then remove it.`
  );
}

/**
 * Validates that each processor has a failure rate below 20%.
 * Returns an array of error messages for processors that exceed the threshold.
 */
function validateProcessorFailureRates(simulationResult: ProcessingSimulationResponse): string[] {
  const errors: string[] = [];
  const maxFailureRate = 0.2; // 20%

  if (!simulationResult.processors_metrics) {
    return errors;
  }

  for (const [processorId, metrics] of Object.entries(simulationResult.processors_metrics)) {
    if (metrics.failed_rate > maxFailureRate) {
      const failurePercentage = (metrics.failed_rate * 100).toFixed(2);
      errors.push(
        `Processor "${processorId}" has a failure rate of ${failurePercentage}% (maximum allowed: 20%). This processor is failing on too many documents. Review the processor configuration and ensure it handles the document structure correctly.`
      );
    }
  }

  return errors;
}

/**
 * Builds a per-processor summary for the LLM, including failure rates
 * and top error messages so the LLM can identify which processor is broken.
 */
function getProcessorMetricsSummary(
  simulationResult: ProcessingSimulationResponse
): Record<string, { failed_rate: string; errors: string[] }> {
  const summary: Record<string, { failed_rate: string; errors: string[] }> = {};

  if (!simulationResult.processors_metrics) {
    return summary;
  }

  for (const [processorId, metrics] of Object.entries(simulationResult.processors_metrics)) {
    const topErrors = metrics.errors
      .slice(0, 3)
      .map((err) => err.message)
      .filter(Boolean);

    summary[processorId] = {
      failed_rate: `${(metrics.failed_rate * 100).toFixed(1)}%`,
      errors: topErrors,
    };
  }

  return summary;
}

export function getUniqueDocumentErrors(simulationResult: ProcessingSimulationResponse): string[] {
  if (!simulationResult.documents || simulationResult.documents.length === 0) {
    return [];
  }

  // Collect all unique error messages
  const errorMap = new Map<string, { count: number; type: string; exampleDoc?: any }>();

  for (const doc of simulationResult.documents) {
    if (doc.errors && doc.errors.length > 0) {
      for (const error of doc.errors) {
        const processorId = 'processor_id' in error ? error.processor_id : undefined;
        const key = processorId
          ? `[${processorId}] ${error.message}`
          : `${error.type}: ${error.message}`;
        if (!errorMap.has(key)) {
          errorMap.set(key, {
            count: 1,
            type: error.type,
            exampleDoc: doc.value,
          });
        } else {
          errorMap.get(key)!.count++;
        }
      }
    }
  }

  // Format errors with counts and example context
  const uniqueErrors: string[] = [];
  const maxErrors = 5;
  const maxErrorLength = 250;
  let errorIndex = 0;

  for (const [errorKey, errorInfo] of errorMap.entries()) {
    if (errorIndex >= maxErrors) {
      break;
    }

    const countStr = errorInfo.count > 1 ? ` (occurred in ${errorInfo.count} documents)` : '';
    const fullError = `${errorKey}${countStr}`;

    // Truncate error message if it exceeds max length
    const truncatedError =
      fullError.length > maxErrorLength
        ? `${fullError.substring(0, maxErrorLength)}...`
        : fullError;

    uniqueErrors.push(truncatedError);
    errorIndex++;
  }

  // Add message if there are more errors
  const remainingErrors = errorMap.size - maxErrors;
  if (remainingErrors > 0) {
    uniqueErrors.push(`... and ${remainingErrors} more error(s)`);
  }

  return uniqueErrors;
}

async function getMappedFields(esClient: ElasticsearchClient, index: string) {
  // get mapped fields for specified index
  const fieldCaps = await esClient.fieldCaps({
    index,
    fields: '*',
  });

  const mappedFields: Record<string, string> = {};
  for (const [fieldName, typeInfo] of Object.entries(fieldCaps.fields)) {
    for (const [typeName, fieldDetails] of Object.entries(typeInfo)) {
      if (!fieldDetails.metadata_field) {
        mappedFields[fieldName] = typeName;
        break;
      }
    }
  }

  // Sort alphabetically by field name
  return Object.keys(mappedFields)
    .sort()
    .reduce<Record<string, string>>((sorted, key) => {
      sorted[key] = mappedFields[key];
      return sorted;
    }, {});
}

async function buildSimulationFeedback(
  simulateResult: ProcessingSimulationResponse,
  fieldsMetadataClient: IFieldsMetadataClient,
  isOtel: boolean,
  mappedFields: Record<string, string>,
  temporaryFields: string[]
): Promise<{
  valid: boolean;
  errors?: string[];
  metrics: { sampled: number; fields: string[]; parse_rate: number };
  processors?: Record<string, { failed_rate: string; errors: string[] }>;
}> {
  const metrics = await getSimulationMetrics(
    simulateResult,
    fieldsMetadataClient,
    isOtel,
    mappedFields
  );
  const uniqueErrors = getUniqueDocumentErrors(simulateResult);
  const processorsSummary = getProcessorMetricsSummary(simulateResult);
  const remainingTempFields = findRemainingTemporaryFields(simulateResult, temporaryFields);
  const processorFailures = validateProcessorFailureRates(simulateResult);

  const hardErrors = [...processorFailures, ...remainingTempFields];
  const allErrors = [...hardErrors, ...uniqueErrors];
  const hasProcessors = Object.keys(processorsSummary).length > 0;

  return {
    valid: hardErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    metrics,
    processors: hasProcessors ? processorsSummary : undefined,
  };
}

async function getSimulationMetrics(
  simulationResult: ProcessingSimulationResponse,
  fieldsMetadataClient: IFieldsMetadataClient,
  isOtel: boolean,
  mappedFields: Record<string, string>
) {
  if (simulationResult.definition_error || simulationResult.documents.length === 0) {
    return {
      sampled: 0,
      fields: [],
      parse_rate: 0,
    };
  }

  const documents = simulationResult.documents;
  const sampled = documents.length;

  // Calculate success/parsed rate
  const parseRate = simulationResult.documents_metrics.parsed_rate * 100;

  // Collect all unique fields and sample values from documents
  const fieldMap = new Map<string, Set<string | number | boolean | null>>();

  for (const doc of documents) {
    if (doc.value) {
      for (const [fieldName, fieldValue] of Object.entries(doc.value)) {
        if (!fieldMap.has(fieldName)) {
          fieldMap.set(fieldName, new Set());
        }
        const values = fieldMap.get(fieldName)!;

        // Store sample values (limit to avoid memory issues)
        if (values.size < 100) {
          if (fieldValue != null) {
            const stringValue = String(fieldValue);
            // Truncate long values
            values.add(
              stringValue.length > 100 ? stringValue.substring(0, 100) + '...' : stringValue
            );
          }
        }
      }
    }
  }

  // Check ECS status for all fields
  const fieldNames = Array.from(fieldMap.keys());
  const fieldMetadataMap = await fieldsMetadataClient.find({
    fieldNames,
    source: isOtel ? 'otel' : 'ecs',
  });

  const fieldsMetadata = fieldMetadataMap.getFields();

  // Build fields array with metrics
  const fields = Array.from(fieldMap.entries()).map(([fieldName, values]) => {
    const metadata = fieldsMetadata[fieldName];

    // Get actual type from mappedFields
    const actualType = mappedFields[fieldName] || 'unmapped';

    // Build type display with ECS/metadata indicator
    const typeIndicator = metadata ? `${metadata.source}: ${metadata.type}` : actualType;

    // Get distinct values count and samples
    const distinctValues = values.size;
    const sampleValues = Array.from(values).slice(0, 10);
    const remainingCount = distinctValues > 10 ? distinctValues - 10 : 0;

    let valuesDescription = '';
    if (distinctValues === 0) {
      valuesDescription = '0 distinct values';
    } else if (distinctValues === 1) {
      valuesDescription = `1 distinct value (\`${sampleValues[0]}\`)`;
    } else if (distinctValues <= 10) {
      valuesDescription = `${distinctValues} distinct values (${sampleValues
        .map((v) => `\`${v}\``)
        .join(', ')})`;
    } else {
      valuesDescription = `${distinctValues} distinct values (${sampleValues
        .map((v) => `\`${v}\``)
        .join(', ')}, ${remainingCount} more values)`;
    }

    return `${fieldName} (${typeIndicator}) - ${valuesDescription}`;
  });

  return {
    sampled,
    fields,
    parse_rate: parseFloat(parseRate.toFixed(2)),
  };
}

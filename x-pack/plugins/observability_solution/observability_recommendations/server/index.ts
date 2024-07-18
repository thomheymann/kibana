/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

const configSchema = schema.object({
  serverless: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.literal(true),
      options: { defaultValue: schema.contextRef('serverless') },
    }),
  }),
});

export type ObservabilityOnboardingConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ObservabilityOnboardingConfig> = {
  exposeToBrowser: {
    serverless: true,
  },
  schema: configSchema,
};

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ObservabilityRecommendationsPlugin } = await import('./plugin');
  return new ObservabilityRecommendationsPlugin(initializerContext);
}

export type {
  ObservabilityRecommendationsPluginSetup,
  ObservabilityRecommendationsPluginStart,
} from './types';

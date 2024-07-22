/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, RequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';
import type { CoreSetup } from '@kbn/core/server';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type {
  ObservabilityRecommendationsPluginStartDependencies,
  ObservabilityRecommendationsPluginStart,
} from '../types';

const CONTAINER_IMAGE_NAME_PATTERNS: Record<string, RegExp> = {
  postgresql: /^postgres:/i,
  mysql: /^mysql:/i,
  mongodb: /^mongo:/i,
  nginx: /^nginx:/i,
  nginx_ingress_controller: /^nginx\/nginx-ingress:/i,
  elasticsearch: /^elasticsearch:/i,
  kibana: /^kibana:/i,
  redis: /^redis:/i,
  apache_tomcat: /^tomcat:/i,
  apache: /^httpd:/i,
  cassandra: /^cassandra:/i,
  rabbitmq: /^rabbitmq:/i,
  memcached: /^memcached:/i,
  haproxy: /^haproxy:/i,
};

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

export interface IntegrationDetectedRecommendation {
  type: 'integration_detected';
  container_name: string;
  host_name: string;
  container_image_name: string;
  integration: PackageListItem;
}

export interface ApmDataMissingRecommendation {
  type: 'apm_data_missing';
  container_name: string;
  host_name: string;
  container_image_name: string;
  language?: string;
}

export type Recommendation = IntegrationDetectedRecommendation | ApmDataMissingRecommendation;

export function createRecommendationsRoute(
  router: IRouter<RequestHandlerContext>,
  core: CoreSetup<
    ObservabilityRecommendationsPluginStartDependencies,
    ObservabilityRecommendationsPluginStart
  >
) {
  router.get(
    { path: '/internal/observability-recommendations/recommendations', validate: false },
    async (context, request, response) => {
      const {
        elasticsearch: { client },
      } = await context.core;

      const [, pluginStart] = await core.getStartServices();
      const packageService = await pluginStart.fleet.packageService.asScoped(request);
      const packages = await packageService.getPackages();

      const result = await getContainerImages(client.asCurrentUser);
      const recommendations: Recommendation[] = [];
      if (result.aggregations?.group_by_image_and_container_name?.buckets) {
        for (const bucket of result.aggregations.group_by_image_and_container_name.buckets) {
          const kubernetesContainerName = bucket.key;
          for (const serviceBucket of bucket.container_name.buckets) {
            const serviceName = serviceBucket.key;
            for (const pkgName in CONTAINER_IMAGE_NAME_PATTERNS) {
              if (CONTAINER_IMAGE_NAME_PATTERNS[pkgName].test(kubernetesContainerName)) {
                const matchingPackage = packages.find((pkg) => pkg.name === pkgName);
                if (matchingPackage) {
                  const alreadyActive = await hasExistingLogsOrMetrics(
                    client.asCurrentUser,
                    pkgName,
                    serviceName
                  );
                  if (!alreadyActive) {
                    recommendations.push({
                      type: 'integration_detected',
                      container_name: serviceName,
                      host_name: bucket.host_name?.buckets[0]?.key,
                      container_image_name: kubernetesContainerName,
                      integration: matchingPackage,
                    });
                  }
                }
                break;
              }
            }
          }
        }
      }

      return response.ok<RecommendationsResponse>({
        body: {
          recommendations,
        },
      });
    }
  );
}

async function getContainerImages(client: ElasticsearchClient) {
  return client.search<
    unknown,
    { group_by_image_and_container_name: estypes.AggregationsStringTermsAggregate }
  >({
    index: ['logs-kubernetes.*-*', 'metrics-kubernetes.*-*'],
    size: 0,
    query: {
      bool: {
        must: [
          {
            term: {
              'kubernetes.namespace': {
                value: 'default',
              },
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 'now-15m',
              },
            },
          },
        ],
      },
    },
    aggregations: {
      group_by_image_and_container_name: {
        terms: {
          field: 'container.image.name',
          order: { _key: 'asc' },
        },
        aggregations: {
          container_name: {
            terms: {
              field: 'kubernetes.container.name',
            },
          },
          host_name: {
            terms: {
              field: 'host.name',
            },
          },
        },
      },
    },
  });
}

async function hasExistingLogsOrMetrics(
  client: ElasticsearchClient,
  pkgName: string,
  serviceName: string
) {
  const result = await client.search({
    index: [`logs-${pkgName}.*-*`, `metrics-${pkgName}.*-*`],
    ignore_unavailable: true,
    size: 0,
    terminate_after: 1,
    query: {
      bool: {
        must: [
          {
            term: {
              'kubernetes.namespace': {
                value: 'default',
              },
            },
          },
          {
            term: {
              'kubernetes.container.name': {
                value: serviceName,
              },
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 'now-15m',
              },
            },
          },
        ],
      },
    },
  });
  return Boolean(result.hits.total?.value);
}

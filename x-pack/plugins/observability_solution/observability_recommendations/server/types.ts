/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import { CustomRequestHandlerContext } from '@kbn/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export interface ObservabilityRecommendationsPluginSetupDependencies {
  data: DataPluginSetup;
  observability: ObservabilityPluginSetup;
  cloud: CloudSetup;
  usageCollection: UsageCollectionSetup;
  fleet: FleetSetupContract;
  security: SecurityPluginSetup;
}

export interface ObservabilityRecommendationsPluginStartDependencies {
  data: DataPluginStart;
  observability: undefined;
  cloud: CloudStart;
  usageCollection: undefined;
  fleet: FleetStartContract;
  security: SecurityPluginStart;
}

export type ObservabilityRecommendationsPluginSetup = void;
export type ObservabilityRecommendationsPluginStart = void;

export type ObservabilityRecommendationsRequestHandlerContext = CustomRequestHandlerContext<{}>;

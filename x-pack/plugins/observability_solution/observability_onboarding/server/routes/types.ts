/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import * as t from 'io-ts';
import { ObservabilityOnboardingServerRouteRepository } from '.';
import { ObservabilityOnboardingConfig } from '..';
import { EsLegacyConfigService } from '../services/es_legacy_config_service';
import {
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStartDependencies,
  ObservabilityOnboardingRequestHandlerContext,
} from '../types';

export type { ObservabilityOnboardingServerRouteRepository };

export interface ObservabilityOnboardingRouteHandlerResources {
  context: ObservabilityOnboardingRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  plugins: {
    [key in keyof ObservabilityOnboardingPluginSetupDependencies]: {
      setup: Required<ObservabilityOnboardingPluginSetupDependencies>[key];
      start: () => Promise<Required<ObservabilityOnboardingPluginStartDependencies>[key]>;
    };
  };
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
  config: ObservabilityOnboardingConfig;
  kibanaVersion: string;
  services: {
    esLegacyConfigService: EsLegacyConfigService;
  };
}

export interface ObservabilityOnboardingRouteCreateOptions {
  options: {
    tags: string[];
    xsrfRequired?: boolean;
  };
}

const RegistryIntegrationRT = t.type({
  pkgName: t.string,
  installSource: t.literal('registry'),
});
const CustomIntegrationRT = t.type({
  pkgName: t.string,
  installSource: t.literal('custom'),
  logFilePaths: t.array(t.string),
});
export const IntegrationRT = t.union([RegistryIntegrationRT, CustomIntegrationRT]);

export type RegistryIntegration = t.TypeOf<typeof RegistryIntegrationRT>;
export type CustomIntegration = t.TypeOf<typeof CustomIntegrationRT>;
export type Integration = t.TypeOf<typeof IntegrationRT>;

export const ElasticAgentStepPayloadRT = t.type({
  agentId: t.string,
});

export type ElasticAgentStepPayload = t.TypeOf<typeof ElasticAgentStepPayloadRT>;

export const InstallIntegrationsStepPayloadRT = t.array(IntegrationRT);

export type InstallIntegrationsStepPayload = t.TypeOf<typeof InstallIntegrationsStepPayloadRT>;

export const StepProgressPayloadRT = t.union([
  ElasticAgentStepPayloadRT,
  InstallIntegrationsStepPayloadRT,
]);

export type StepProgressPayload = t.TypeOf<typeof StepProgressPayloadRT>;

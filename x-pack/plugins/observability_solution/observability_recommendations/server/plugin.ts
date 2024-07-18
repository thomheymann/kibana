/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  ObservabilityRecommendationsPluginSetup,
  ObservabilityRecommendationsPluginStart,
  ObservabilityRecommendationsPluginSetupDependencies,
  ObservabilityRecommendationsPluginStartDependencies,
} from './types';

export class ObservabilityRecommendationsPlugin
  implements
    Plugin<
      ObservabilityRecommendationsPluginSetup,
      ObservabilityRecommendationsPluginStart,
      ObservabilityRecommendationsPluginSetupDependencies,
      ObservabilityRecommendationsPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = this.initContext.logger.get();
  }

  public setup(
    core: CoreSetup<
      ObservabilityRecommendationsPluginStartDependencies,
      ObservabilityRecommendationsPluginStart
    >,
    plugins: ObservabilityRecommendationsPluginSetupDependencies
  ) {
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

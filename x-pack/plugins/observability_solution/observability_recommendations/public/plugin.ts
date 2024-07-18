/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { PLUGIN_ID } from '../common';
import { ConfigSchema } from '.';

export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  discover: DiscoverSetup;
  share: SharePluginSetup;
  fleet: FleetSetup;
  security: SecurityPluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  discover: DiscoverStart;
  share: SharePluginStart;
  fleet: FleetStart;
  security: SecurityPluginStart;
  cloud?: CloudStart;
  usageCollection?: UsageCollectionStart;
  cloudExperiments?: CloudExperimentsPluginStart;
}

export type ObservabilityOnboardingContextValue = CoreStart &
  ObservabilityOnboardingPluginStartDeps & { config: ConfigSchema };

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart>
{
  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOnboardingPluginSetupDeps) {
    const pluginSetupDeps = plugins;

    core.application.register({
      id: PLUGIN_ID,
      title: 'Recommendations',
      order: 9500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['globalSearch', 'sideNav'],
      keywords: ['logs', 'log', 'explorer', 'logs explorer'],
      async mount(appMountParameters: AppMountParameters) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./app'),
          core.getStartServices(),
        ]);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ObservabilityOnboardingPluginStartDeps,
        });
      },
    });

    return {};
  }
  public start(_core: CoreStart, _plugins: ObservabilityOnboardingPluginStartDeps) {
    return {};
  }
}

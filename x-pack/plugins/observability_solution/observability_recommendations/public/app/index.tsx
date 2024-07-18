/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import type {
  ObservabilityOnboardingPluginSetupDeps,
  ObservabilityOnboardingPluginStartDeps,
} from '../plugin';
import { ObservabilityRecommendations } from './observability_recommendations';

export function AppRoot({
  appMountParameters,
  core,
  corePlugins,
}: {
  appMountParameters: AppMountParameters;
} & RenderAppProps) {
  const { history, theme$ } = appMountParameters;
  const services = {
    ...core,
    ...corePlugins,
  };

  return (
    <KibanaRenderContextProvider {...core}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks coreStart={core}>
          <KibanaContextProvider services={services}>
            <KibanaThemeProvider theme={{ theme$ }}>
              <Router history={history}>
                <ObservabilityRecommendations />
              </Router>
            </KibanaThemeProvider>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>
  );
}

interface RenderAppProps {
  core: CoreStart;
  deps: ObservabilityOnboardingPluginSetupDeps;
  appMountParameters: AppMountParameters;
  corePlugins: ObservabilityOnboardingPluginStartDeps;
}

export const renderApp = (props: RenderAppProps) => {
  const { element } = props.appMountParameters;

  ReactDOM.render(<AppRoot {...props} />, element);

  return () => {
    props.corePlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};

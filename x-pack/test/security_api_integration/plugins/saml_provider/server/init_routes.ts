/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import {
  getSAMLResponse,
  getSAMLRequestId,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';

export function initRoutes(pluginContext: PluginInitializerContext, core: CoreSetup) {
  const serverInfo = core.http.getServerInfo();
  core.http.resources.register(
    {
      path: '/saml_provider/login',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      const samlResponse = await getSAMLResponse({
        inResponseTo: await getSAMLRequestId(request.url.href!),
        destination: `${serverInfo.protocol}://${serverInfo.hostname}:${serverInfo.port}/api/security/saml/callback`,
      });

      return response.renderHtml({
        body: `
          <!DOCTYPE html>
          <title>Kibana SAML Login</title>
          <link rel="icon" href="data:,">
          <script defer src="/saml_provider/login/submit.js"></script>
          <body>
            <form id="loginForm" method="post" action="/api/security/saml/callback">
                <input name="SAMLResponse" type="hidden" value="${samlResponse}" />
            </form>
          </body>
        `,
      });
    }
  );

  core.http.resources.register(
    { path: '/saml_provider/login/submit.js', validate: false, options: { authRequired: false } },
    (context, request, response) => {
      return response.renderJs({ body: 'document.getElementById("loginForm").submit();' });
    }
  );

  core.http.resources.register(
    {
      path: '/saml_provider/logout',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.redirected({ headers: { location: '/logout?SAMLResponse=something' } });
    }
  );

  // [HACK]: Incredible hack to workaround absence of the Mock IDP plugin in production build used for testing.
  if (pluginContext.env.mode.prod) {
    core.http.resources.register(
      {
        path: '/mock_idp/login',
        validate: false,
        options: { authRequired: false },
      },
      async (context, request, response) => {
        return response.redirected({ headers: { location: 'https://cloud.elastic.co/projects' } });
      }
    );
  }

  let attemptsCounter = 0;
  core.http.resources.register(
    {
      path: '/saml_provider/never_login',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.renderHtml({
        body: `
          <!DOCTYPE html>
          <title>Kibana SAML Login</title>
          <link rel="icon" href="data:,">
          <body data-test-subj="idp-page">
            <span>Attempt #${++attemptsCounter}</span>
          </body>
        `,
      });
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import { routeDefinitionParamsMock } from './index.mock';
import { defineStatusRoute } from './status';

describe('Status routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockRouteParams: ReturnType<typeof routeDefinitionParamsMock.create>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    mockRouteParams = routeDefinitionParamsMock.create();
    router = mockRouteParams.router;

    mockContext = {} as unknown as RequestHandlerContext;

    defineStatusRoute(mockRouteParams);
  });

  describe('#status', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    beforeEach(() => {
      const [statusRouteConfig, statusRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/interactive_setup/status'
      )!;

      routeConfig = statusRouteConfig;
      routeHandler = statusRouteHandler;
    });

    it('should return connection status', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves
        .toMatchInlineSnapshot(`
              KibanaResponse {
                "options": Object {
                  "body": Object {
                    "connectionStatus": "configured",
                    "isSetupOnHold": undefined,
                  },
                },
                "payload": Object {
                  "connectionStatus": "configured",
                  "isSetupOnHold": undefined,
                },
                "status": 200,
              }
            `);
    });
  });
});

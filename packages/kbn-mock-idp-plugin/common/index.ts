/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { resolve } from 'path';

export const MOCK_IDP_PLUGIN_PATH = resolve(__dirname, '..');

export {
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_REALM_TYPE,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ROLE_MAPPING_NAME,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
  MOCK_IDP_ROLE_NAMES,
} from './constants';

export {
  createMockIdpMetadata,
  createSAMLResponse,
  ensureSAMLRoleMapping,
  parseSAMLAuthnRequest,
} from './utils';

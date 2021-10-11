/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfigPath } from '@kbn/utils';
import inquirer from 'inquirer';
import { duration } from 'moment';
import { merge } from 'lodash';

import { Logger } from '../core/server';
import { ClusterClient } from '../core/server/elasticsearch/client';
import { configSchema } from '../core/server/elasticsearch';
import { ElasticsearchService } from '../plugins/interactive_setup/server/elasticsearch_service';
import { KibanaConfigWriter } from '../plugins/interactive_setup/server/kibana_config_writer';
import type { EnrollmentToken } from '../plugins/interactive_setup/common';

export const logger: Logger = {
  debug: () => {},
  error: () => {},
  warn: () => {},
  trace: () => {},
  info: () => {},
  fatal: () => {},
  log: () => {},
  get: () => logger,
};

export const kibanaConfigWriter = new KibanaConfigWriter(getConfigPath(), logger);
export const elasticsearch = new ElasticsearchService(logger).setup({
  connectionCheckInterval: duration(999999),
  elasticsearch: {
    createClient: (type, config) => {
      const defaults = configSchema.validate({});
      return new ClusterClient(
        merge(
          defaults,
          {
            hosts: Array.isArray(defaults.hosts) ? defaults.hosts : [defaults.hosts],
          },
          config
        ),
        logger,
        type
      );
    },
  },
});

export async function promptToken() {
  const answers = await inquirer.prompt({
    type: 'input',
    name: 'token',
    message: 'Enter enrollment token:',
    validate: (value = '') => (decodeEnrollmentToken(value) ? true : 'Invalid enrollment token'),
  });
  return answers.token;
}

export function decodeEnrollmentToken(enrollmentToken): EnrollmentToken | undefined {
  try {
    const json = JSON.parse(atob(enrollmentToken)) as EnrollmentToken;
    if (
      !Array.isArray(json.adr) ||
      json.adr.some((adr) => typeof adr !== 'string') ||
      typeof json.fgr !== 'string' ||
      typeof json.key !== 'string' ||
      typeof json.ver !== 'string'
    ) {
      return;
    }
    return { ...json, adr: json.adr.map((adr) => `https://${adr}`), key: btoa(json.key) };
  } catch (error) {} // eslint-disable-line no-empty
}

function btoa(str) {
  return Buffer.from(str, 'binary').toString('base64');
}

function atob(str) {
  return Buffer.from(str, 'base64').toString('binary');
}

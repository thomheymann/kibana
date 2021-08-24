/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constants } from 'fs';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

import type { Logger } from 'src/core/server';

import { getDetailedErrorMessage } from './errors';

export interface WriteConfigParameters {
  host: string;
  caCert?: string;
  username?: string;
  password?: string;
  serviceAccountToken?: { name: string; value: string };
}

export class KibanaConfigWriter {
  constructor(private readonly configPath: string, private readonly logger: Logger) {}

  /**
   * Checks if we can write to the Kibana configuration file and configuration directory.
   */
  public async isConfigWritable() {
    try {
      // We perform two separate checks here:
      // 1. If we can write to config directory to add a new CA certificate file and potentially Kibana configuration
      // file if it doesn't exist for some reason.
      // 2. If we can write to the Kibana configuration file if it exists.
      const canWriteToConfigDirectory = fs.access(path.dirname(this.configPath), constants.W_OK);
      await Promise.all([
        canWriteToConfigDirectory,
        fs.access(this.configPath, constants.F_OK).then(
          () => fs.access(this.configPath, constants.W_OK),
          () => canWriteToConfigDirectory
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Writes Elasticsearch configuration to the disk.
   * @param params
   */
  public async writeConfig(params: WriteConfigParameters) {
    const caPath = path.join(path.dirname(this.configPath), `ca_${Date.now()}.crt`);

    if (params.caCert) {
      this.logger.debug(`Writing CA certificate to ${caPath}.`);
      try {
        await fs.writeFile(caPath, params.caCert);
        this.logger.debug(`Successfully wrote CA certificate to ${caPath}.`);
      } catch (err) {
        this.logger.error(
          `Failed to write CA certificate to ${caPath}: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      }
    }

    this.logger.debug(`Writing Elasticsearch configuration to ${this.configPath}.`);
    try {
      const config: Record<string, any> = { 'elasticsearch.hosts': [params.host] };
      if (params.username) {
        config['elasticsearch.username'] = params.username;
      }
      if (params.password) {
        config['elasticsearch.password'] = params.password;
      }
      if (params.serviceAccountToken) {
        config['elasticsearch.serviceAccountToken'] = params.serviceAccountToken.value;
      }
      if (params.caCert) {
        config['elasticsearch.ssl.certificateAuthorities'] = [caPath];
      }
      await fs.appendFile(
        this.configPath,
        `\n\n# This section was automatically generated during setup.\n${yaml.safeDump(config, {
          flowLevel: 1,
        })}\n`
      );
      this.logger.debug(`Successfully wrote Elasticsearch configuration to ${this.configPath}.`);
    } catch (err) {
      this.logger.error(
        `Failed to write  Elasticsearch configuration to ${
          this.configPath
        }: ${getDetailedErrorMessage(err)}.`
      );
      throw err;
    }
  }
}

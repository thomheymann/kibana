/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiTitle,
  EuiPageTemplate,
  EuiCard,
  EuiIcon,
  EuiButton,
  EuiLink,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AgentIcon } from '@kbn/custom-icons';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ObservabilityOnboardingAppServices } from '..';

export function ObservabilityRecommendations() {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        iconType="uptimeApp"
        pageTitle={i18n.translate(
          'app_not_found_in_i18nrc.observabilityRecommendations.div.observabilityrecommendationsLabel',
          { defaultMessage: 'Recommendations' }
        )}
        description="Complete these tasks to get the most out of your Observability data."
      />
      <EuiPageTemplate.Section>
        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'app_not_found_in_i18nrc.observabilityRecommendations.h2.databaseContainerLabel',
              { defaultMessage: 'Detected integrations' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiCard
          icon={<EuiIcon type={http.staticAssets.getPluginAssetHref('postgresql.svg')} size="l" />}
          title={i18n.translate(
            'app_not_found_in_i18nrc.observabilityRecommendations.euiCard.postgresLabel',
            { defaultMessage: 'Annotate your PostgreSQL container' }
          )}
          betaBadgeProps={{
            label: 'Integration detected',
            color: 'accent',
          }}
          titleSize="xs"
          layout="horizontal"
          hasBorder
        >
          <EuiTextColor color="subdued">
            <p>
              <FormattedMessage
                id="app_not_found_in_i18nrc.observabilityRecommendations.PanelLabel"
                defaultMessage="We have detected {documents} that are not correctly ingested using the {integration}."
                values={{
                  documents: (
                    <EuiLink
                      data-test-subj="observabilityRecommendationsObservabilityRecommendations3819DocumentsLink"
                      href="https://www.elastic.co/integrations/postgresql"
                    >
                      {i18n.translate(
                        'app_not_found_in_i18nrc.observabilityRecommendations.DocumentsLinkLabel',
                        { defaultMessage: '3,819 logs' }
                      )}
                    </EuiLink>
                  ),
                  integration: (
                    <EuiLink
                      data-test-subj="observabilityRecommendationsObservabilityRecommendations3819DocumentsLink"
                      href="https://www.elastic.co/integrations/postgresql"
                      target="_blank"
                    >
                      {i18n.translate(
                        'app_not_found_in_i18nrc.observabilityRecommendations.postgresqlIntegrationLinkLabel',
                        { defaultMessage: 'PostgreSQL integration' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <EuiSpacer size="s" />
            <p>
              {i18n.translate('app_not_found_in_i18nrc.observabilityRecommendations.PanelLabel', {
                defaultMessage:
                  'Installing the PostgreSQL integration will enable in-depth performance metrics and errors.',
              })}
            </p>
          </EuiTextColor>
          <EuiSpacer />

          <EuiButton data-test-subj="observabilityRecommendationsObservabilityRecommendationsInstallPostgreSqlIntegrationButton">
            {i18n.translate(
              'app_not_found_in_i18nrc.observabilityRecommendations.goForItButtonLabel',
              { defaultMessage: 'Annotate PostgreSQL container' }
            )}
          </EuiButton>
        </EuiCard>
        <EuiSpacer size="xl" />

        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'app_not_found_in_i18nrc.observabilityRecommendations.h2.databaseContainerLabel',
              { defaultMessage: 'Missing metrics' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiCard
          icon={<AgentIcon agentName="java" size="l" />}
          title={i18n.translate(
            'app_not_found_in_i18nrc.observabilityRecommendations.euiCard.postgresLabel',
            { defaultMessage: 'Include APM agent in "backend" application' }
          )}
          titleSize="xs"
          layout="horizontal"
          hasBorder
        >
          <EuiTextColor color="subdued">
            <p>
              {i18n.translate(
                'app_not_found_in_i18nrc.observabilityRecommendations.p.yourApplicationIsNotLabel',
                { defaultMessage: 'Your application is not sending any APM data.' }
              )}
            </p>
            <EuiSpacer size="s" />
            <p>
              {i18n.translate(
                'app_not_found_in_i18nrc.observabilityRecommendations.p.includingTheAPMAgentLabel',
                {
                  defaultMessage:
                    'Including the APM agent in your application will enable in-depth performance metrics and errors.',
                }
              )}
            </p>
          </EuiTextColor>
          <EuiSpacer />

          <EuiButton data-test-subj="observabilityRecommendationsObservabilityRecommendationsInstallApmAgentButton">
            {i18n.translate(
              'app_not_found_in_i18nrc.observabilityRecommendations.goForItButtonLabel',
              { defaultMessage: 'Include APM agent' }
            )}
          </EuiButton>
        </EuiCard>
        <EuiSpacer />

        <EuiCard
          icon={<AgentIcon agentName="nodejs" size="l" />}
          title={i18n.translate(
            'app_not_found_in_i18nrc.observabilityRecommendations.euiCard.postgresLabel',
            { defaultMessage: 'Include APM agent in "frontend" application' }
          )}
          titleSize="xs"
          layout="horizontal"
          hasBorder
        >
          <EuiTextColor color="subdued">
            <p>
              {i18n.translate(
                'app_not_found_in_i18nrc.observabilityRecommendations.p.yourApplicationIsNotLabel',
                { defaultMessage: 'Your application is not sending any APM data.' }
              )}
            </p>
            <EuiSpacer size="s" />
            <p>
              {i18n.translate(
                'app_not_found_in_i18nrc.observabilityRecommendations.p.includingTheAPMAgentLabel',
                {
                  defaultMessage:
                    'Including the APM agent in your application will enable in-depth performance metrics and errors.',
                }
              )}
            </p>
          </EuiTextColor>
          <EuiSpacer />

          <EuiButton data-test-subj="observabilityRecommendationsObservabilityRecommendationsInstallApmAgentButton">
            {i18n.translate(
              'app_not_found_in_i18nrc.observabilityRecommendations.goForItButtonLabel',
              { defaultMessage: 'Include APM agent' }
            )}
          </EuiButton>
        </EuiCard>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}

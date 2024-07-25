/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import {
  EuiTitle,
  EuiPageTemplate,
  EuiCard,
  EuiButton,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AgentIcon } from '@kbn/custom-icons';
import useAsync from 'react-use/lib/useAsync';
import type { ObservabilityOnboardingAppServices } from '..';
import type {
  RecommendationsResponse,
  IntegrationDetectedRecommendation,
} from '../../server/routes/recommendations';
import { DetectedIntegrationCard } from './detected_integration_card';

export const ObservabilityRecommendations: FunctionComponent = () => {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const { loading, value } = useAsync(() =>
    http.get<RecommendationsResponse>('/internal/observability-recommendations/recommendations')
  );

  if (loading || !value) {
    return (
      <div>
        {i18n.translate(
          'xpack.observabilityRecommendations.observabilityRecommendations.div.loadingLabel',
          {
            defaultMessage: 'Loading...',
          }
        )}
      </div>
    );
  }

  const integrationRecommendations = value.recommendations.filter(
    (recommendation): recommendation is IntegrationDetectedRecommendation =>
      recommendation.type === 'integration_detected'
  );

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        iconType="uptimeApp"
        pageTitle={i18n.translate(
          'xpack.observabilityRecommendations.observabilityRecommendations.div.observabilityrecommendationsLabel',
          { defaultMessage: 'Recommendations' }
        )}
        description="Complete these tasks to get the most out of your Observability data."
      />
      <EuiPageTemplate.Section>
        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'xpack.observabilityRecommendations.observabilityRecommendations.h2.databaseContainerLabel',
              { defaultMessage: 'Detected integrations' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        {integrationRecommendations.map((recommendation) => (
          <>
            <DetectedIntegrationCard recommendation={recommendation} />
            <EuiSpacer size="xl" />
          </>
        ))}

        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'xpack.observabilityRecommendations.observabilityRecommendations.h2.databaseContainerLabel',
              { defaultMessage: 'Missing metrics' }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiCard
          icon={<AgentIcon agentName="java" size="l" />}
          title={i18n.translate(
            'xpack.observabilityRecommendations.observabilityRecommendations.euiCard.postgresLabel',
            { defaultMessage: 'Include APM agent in "backend" application' }
          )}
          titleSize="xs"
          layout="horizontal"
          hasBorder
        >
          <EuiTextColor color="subdued">
            <p>
              {i18n.translate(
                'xpack.observabilityRecommendations.observabilityRecommendations.p.yourApplicationIsNotLabel',
                { defaultMessage: 'Your application is not sending any APM data.' }
              )}
            </p>
            <EuiSpacer size="s" />
            <p>
              {i18n.translate(
                'xpack.observabilityRecommendations.observabilityRecommendations.p.includingTheAPMAgentLabel',
                {
                  defaultMessage:
                    'Include the APM agent in your application to enable in-depth performance metrics and errors.',
                }
              )}
            </p>
          </EuiTextColor>
          <EuiSpacer />
          <EuiButton data-test-subj="observabilityRecommendationsObservabilityRecommendationsInstallApmAgentButton">
            {i18n.translate(
              'xpack.observabilityRecommendations.observabilityRecommendations.goForItButtonLabel',
              { defaultMessage: 'Include APM agent' }
            )}
          </EuiButton>
        </EuiCard>
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

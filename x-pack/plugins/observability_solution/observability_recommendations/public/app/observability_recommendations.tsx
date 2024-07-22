/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import {
  EuiTitle,
  EuiPageTemplate,
  EuiCard,
  EuiIcon,
  EuiButton,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTextColor,
  EuiBadge,
  EuiBadgeGroup,
  EuiFlyout,
  EuiText,
  EuiCodeBlock,
  EuiFlyoutProps,
  EuiSteps,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AgentIcon } from '@kbn/custom-icons';
import { FormattedMessage } from '@kbn/i18n-react';
import useAsync from 'react-use/lib/useAsync';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useEvent from 'react-use/lib/useEvent';
import useInterval from 'react-use/lib/useInterval';
import type { ObservabilityOnboardingAppServices } from '..';
import type {
  RecommendationsResponse,
  IntegrationDetectedRecommendation,
} from '../../server/routes/recommendations';
import { CopyToClipboardButton } from './copy_to_clipboard_button';
import { ProgressIndicator } from './progress_indicator';
import { GetStartedPanel } from './get_started_panel';

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
        <EuiSpacer />

        <EuiCard
          icon={<AgentIcon agentName="nodejs" size="l" />}
          title={i18n.translate(
            'xpack.observabilityRecommendations.observabilityRecommendations.euiCard.postgresLabel',
            { defaultMessage: 'Include APM agent in "frontend" application' }
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
                    'Including the APM agent in your application will enable in-depth performance metrics and errors.',
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
        <EuiSpacer />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

interface DetectedIntegrationCardProps {
  recommendation: IntegrationDetectedRecommendation;
}

const DetectedIntegrationCard: FunctionComponent<DetectedIntegrationCardProps> = ({
  recommendation,
}) => {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <DetectedIntegrationFlyout
          recommendation={recommendation}
          onClose={() => setIsOpen(false)}
        />
      )}
      <EuiCard
        icon={
          <EuiIcon
            type={http.staticAssets.getPluginAssetHref(`${recommendation.integration.name}.svg`)}
            size="l"
          />
        }
        title={recommendation.integration.title}
        betaBadgeProps={{
          label: 'Integration detected',
          color: 'accent',
        }}
        titleSize="xs"
        layout="horizontal"
        hasBorder
      >
        <EuiTextColor color="subdued">
          <EuiBadgeGroup gutterSize="s">
            <EuiBadge iconType="node" color="hollow">
              {recommendation.host_name}
            </EuiBadge>
            <EuiBadge iconType="kubernetesNode" color="hollow">
              {recommendation.container_name}
            </EuiBadge>
            <EuiBadge iconType="package" color="hollow">
              {recommendation.container_image_name}
            </EuiBadge>
          </EuiBadgeGroup>
          <EuiSpacer size="m" />
          <p>
            <FormattedMessage
              id="xpack.observabilityRecommendations.observabilityRecommendations.PanelLabel"
              defaultMessage='Your "{container}" container is running "{image}" but not using the {integration} integration.'
              values={{
                container: recommendation.container_name,
                image: recommendation.container_image_name,
                integration: recommendation.integration.title,
              }}
            />
          </p>
          <EuiSpacer size="s" />
          <p>
            {i18n.translate(
              'xpack.observabilityRecommendations.observabilityRecommendations.PanelLabel',
              {
                defaultMessage:
                  'Configure your container to enable in-depth performance metrics and errors.',
              }
            )}
          </p>
        </EuiTextColor>
        <EuiSpacer />
        <EuiButton
          onClick={() => setIsOpen(true)}
          data-test-subj="observabilityRecommendationsObservabilityRecommendationsInstallPostgreSqlIntegrationButton"
        >
          {i18n.translate(
            'xpack.observabilityRecommendations.observabilityRecommendations.goForItButtonLabel',
            {
              defaultMessage: 'Configure container',
              values: { integration: recommendation.integration.title },
            }
          )}
        </EuiButton>
      </EuiCard>
    </>
  );
};

interface DetectedIntegrationFlyoutProps extends EuiFlyoutProps {
  recommendation: IntegrationDetectedRecommendation;
}

export type DetectedIntegrationStatus = 'notStarted' | 'awaitingData' | 'dataReceived';

const DetectedIntegrationFlyout: FunctionComponent<DetectedIntegrationFlyoutProps> = ({
  recommendation,
  ...rest
}) => {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  useEvent('blur', () => setWindowLostFocus(true), window);

  const [state, fetchRecommendations] = useAsyncFn(() =>
    http.get<RecommendationsResponse>('/internal/observability-recommendations/recommendations')
  );

  const hasCompletedTask = state.value
    ? !state.value?.recommendations.find(
        (rcmdn) => rcmdn.container_name === recommendation.container_name
      )
    : false;

  const status: DetectedIntegrationStatus = hasCompletedTask
    ? 'dataReceived'
    : windowLostFocus
    ? 'awaitingData'
    : 'notStarted';

  useInterval(fetchRecommendations, status === 'awaitingData' ? 3000 : null);

  return (
    <EuiFlyout {...rest}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.observabilityRecommendations.detectedIntegrationCard.h3.sampleDocumentLabel',
              {
                defaultMessage: 'Configure {integration} container',
                values: { integration: recommendation.integration.title },
              }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSteps
          steps={[
            {
              status:
                status === 'notStarted'
                  ? 'current'
                  : status === 'dataReceived'
                  ? 'complete'
                  : undefined,
              title: i18n.translate(
                'xpack.observabilityRecommendations.detectedIntegrationCard.h3.sampleDocumentLabel',
                {
                  defaultMessage: 'Edit manifest file',
                }
              ),
              children: (
                <>
                  <EuiText>
                    {i18n.translate(
                      'xpack.observabilityRecommendations.detectedIntegrationFlyout.openYourKubernetesManifestTextLabel',
                      {
                        defaultMessage:
                          'Edit your Kubernetes manifest file and add the following annotation to your "{container}" container definition:',
                        values: { container: recommendation.container_name },
                      }
                    )}
                  </EuiText>
                  <EuiSpacer />
                  <EuiCodeBlock
                    language="yaml"
                    paddingSize="m"
                    lineNumbers={{
                      highlight: '5-6',
                    }}
                  >
                    {`apiVersion: v1
kind: Pod
metadata:
  name: "${recommendation.container_name}"
  annotations:
    co.elastic.hints/package: "${recommendation.integration.name}"
spec:
  containers:
    - name: "${recommendation.container_name}"
      image: "${recommendation.container_image_name}"
...`}
                  </EuiCodeBlock>
                  <EuiSpacer />
                  <CopyToClipboardButton
                    textToCopy={`
  annotations:
    co.elastic.hints/package: "${recommendation.integration.name}"`}
                    fill={status === 'notStarted'}
                  />
                </>
              ),
            },
            {
              status:
                status === 'notStarted'
                  ? 'incomplete'
                  : status === 'dataReceived'
                  ? 'complete'
                  : 'current',
              title: 'Visualize your data',
              children:
                status === 'dataReceived' ? (
                  <>
                    <ProgressIndicator
                      isLoading={false}
                      iconType="cheer"
                      title={i18n.translate(
                        'xpack.observabilityRecommendations.detectedIntegrationFlyout.stepStatus.loadingLabel',
                        { defaultMessage: 'Your data is ready to explore!' }
                      )}
                    />
                    <EuiSpacer />
                    <GetStartedPanel
                      integration={recommendation.integration.name}
                      newTab={false}
                      isLoading={false}
                      dashboardLinks={[
                        {
                          id: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
                          label: i18n.translate(
                            'xpack.observabilityRecommendations.kubernetesPanel.exploreDashboard',
                            {
                              defaultMessage: 'Explore Kubernetes cluster',
                            }
                          ),
                          title: i18n.translate(
                            'xpack.observabilityRecommendations.kubernetesPanel.monitoringCluster',
                            {
                              defaultMessage:
                                'Overview your Kubernetes cluster with this pre-made dashboard',
                            }
                          ),
                        },
                      ]}
                    />
                  </>
                ) : status === 'awaitingData' ? (
                  <ProgressIndicator
                    title={i18n.translate(
                      'xpack.observabilityRecommendations.detectedIntegrationFlyout.stepStatus.loadingLabel',
                      { defaultMessage: 'Waiting for data to arrive...' }
                    )}
                  />
                ) : null,
            },
          ]}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

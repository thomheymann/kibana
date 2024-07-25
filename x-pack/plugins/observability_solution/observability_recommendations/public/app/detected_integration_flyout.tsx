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
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiFlyout,
  EuiText,
  EuiCodeBlock,
  EuiFlyoutProps,
  EuiSteps,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useEvent from 'react-use/lib/useEvent';
import useInterval from 'react-use/lib/useInterval';
import { ObservabilityOnboardingAppServices } from '..';
import {
  RecommendationsResponse,
  IntegrationDetectedRecommendation,
} from '../../server/routes/recommendations';
import { CopyToClipboardButton } from './copy_to_clipboard_button';
import { ProgressIndicator } from './progress_indicator';
import { GetStartedPanel } from './get_started_panel';

interface DetectedIntegrationFlyoutProps extends EuiFlyoutProps {
  recommendation: IntegrationDetectedRecommendation;
}

export type DetectedIntegrationStatus = 'notStarted' | 'awaitingData' | 'dataReceived';

export const DetectedIntegrationFlyout: FunctionComponent<DetectedIntegrationFlyoutProps> = ({
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

  const annotations = `
  annotations:
    co.elastic.hints/package: "${recommendation.integration.name}"
    co.elastic.hints/username: "<username>"
    co.elastic.hints/password: "<password>"`;

  const codeBlock = `apiVersion: v1
kind: Pod
metadata:
  name: "${recommendation.container_name}"
  ${annotations.trim()}
spec:
  containers:
    - name: "${recommendation.container_name}"
      image: "${recommendation.container_image_name}"
...`;

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
                      highlight: '5-8',
                    }}
                  >
                    {codeBlock}
                  </EuiCodeBlock>
                  <EuiSpacer />
                  <CopyToClipboardButton textToCopy={annotations} fill={status === 'notStarted'} />
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

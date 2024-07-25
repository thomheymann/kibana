/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiButton,
  EuiSpacer,
  EuiTextColor,
  EuiBadge,
  EuiBadgeGroup,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityOnboardingAppServices } from '..';
import { IntegrationDetectedRecommendation } from '../../server/routes/recommendations';
import { DetectedIntegrationFlyout } from './detected_integration_flyout';

interface DetectedIntegrationCardProps {
  recommendation: IntegrationDetectedRecommendation;
}
export const DetectedIntegrationCard: FunctionComponent<DetectedIntegrationCardProps> = ({
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
              defaultMessage='Your "{container}" container is running {integration} but not using the matching integration.'
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
                  'Configure your container to enable pre-built dashboards and in-depth performance metrics and errors.',
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

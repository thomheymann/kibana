/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSteps, EuiPanel, EuiStepProps, EuiCallOut } from '@elastic/eui';
import React, { useEffect, FunctionComponent } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';
import useTimeout from 'react-use/lib/useTimeout';
import { i18n } from '@kbn/i18n';
import { useHttp } from './use_http';

export const ProgressIndicator: FunctionComponent = () => {
  const http = useHttp();
  const [status, checkStatus] = useAsyncFn(async () => {
    let isAvailable: boolean | undefined = false;
    let isPastPreboot: boolean | undefined = false;
    try {
      const { response } = await http.get('/api/status', { asResponse: true });
      isAvailable = response ? response.status < 500 : undefined;
      isPastPreboot = response?.headers.get('content-type')?.includes('application/json');
    } catch ({ response }) {
      isAvailable = response ? response.status < 500 : undefined;
      isPastPreboot = response?.headers.get('content-type')?.includes('application/json');
    }
    return isAvailable === true && isPastPreboot === true
      ? 'complete'
      : isAvailable === false
      ? 'unavailable'
      : isAvailable === true && isPastPreboot === false
      ? 'preboot'
      : 'unknown';
  });

  const [_, cancel, reset] = useTimeoutFn(checkStatus, 1000);

  useEffect(() => {
    if (status.value === 'complete') {
      cancel();
      window.location.replace('/');
    } else if (status.loading === false) {
      reset();
    }
  }, [status.loading, status.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const [helpRequired, cancelHelp, resetHelp] = useTimeout(15000);

  useEffect(() => {
    if (status.value === 'complete') {
      cancelHelp();
    } else {
      resetHelp();
    }
  }, [status.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiPanel color="transparent">
      <LoadingSteps
        currentStepId={status.value}
        steps={[
          {
            id: 'preboot',
            title: i18n.translate('interactiveSetup.progressIndicator.prebootStepTitle', {
              defaultMessage: 'Saving settings',
            }),
          },
          {
            id: 'unavailable',
            title: i18n.translate('interactiveSetup.progressIndicator.unavailableStepTitle', {
              defaultMessage: 'Starting Elastic',
            }),
          },
          {
            id: 'complete',
            title: i18n.translate('interactiveSetup.progressIndicator.completeStepTitle', {
              defaultMessage: 'Completing setup',
            }),
          },
        ]}
      />
      {helpRequired() && (
        <EuiCallOut title="Process is not responding" color="warning">
          Check terminal for cause of error.
        </EuiCallOut>
      )}
    </EuiPanel>
  );
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export interface LoadingStepsProps {
  currentStepId?: string;
  steps: Array<Optional<EuiStepProps, 'status' | 'children'>>;
}

export const LoadingSteps: FunctionComponent<LoadingStepsProps> = ({ currentStepId, steps }) => {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);
  return (
    <EuiSteps
      steps={steps.map((step, i) => ({
        status:
          i <= currentStepIndex
            ? 'complete'
            : steps[i - 1]?.id === currentStepId
            ? 'loading'
            : 'incomplete',
        children: null,
        ...step,
      }))}
    />
  );
};

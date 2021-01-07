/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ConfirmModal } from '../../../components/confirm_modal';
import { UserAPIClient } from '..';

export interface ConfirmEnableUsersProps {
  usernames: string[];
  onCancel(): void;
  onSuccess?(): void;
}

export const ConfirmEnableUsers: FunctionComponent<ConfirmEnableUsersProps> = ({
  usernames,
  onCancel,
  onSuccess,
}) => {
  const { services } = useKibana();

  const [state, enableUsers] = useAsyncFn(async () => {
    for (const username of usernames) {
      try {
        await new UserAPIClient(services.http!).enableUser(username);
        services.notifications!.toasts.addSuccess(
          i18n.translate('xpack.security.management.users.confirmEnableUsers.successMessage', {
            defaultMessage: "Enabled user '{username}'",
            values: { username },
          })
        );
        onSuccess?.();
      } catch (error) {
        services.notifications!.toasts.addDanger({
          title: i18n.translate('xpack.security.management.users.confirmEnableUsers.errorMessage', {
            defaultMessage: "Could not enable user '{username}'",
            values: { username },
          }),
          text: (error as any).body?.message || error.message,
        });
      }
    }
  }, [services.http]);

  return (
    <ConfirmModal
      title={i18n.translate('xpack.security.management.users.confirmEnableUsers.title', {
        defaultMessage: "Enable {count, plural, one{user '{username}'} other{{count} users}}?",
        values: { count: usernames.length, username: usernames[0] },
      })}
      onCancel={onCancel}
      onConfirm={enableUsers}
      confirmButtonText={i18n.translate(
        'xpack.security.management.users.confirmEnableUsers.confirmButton',
        {
          defaultMessage: '{isLoading, select, true{Disabling user…} other{Enable user}}',
          values: { isLoading: state.loading },
        }
      )}
      isLoading={state.loading}
      ownFocus
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.security.management.users.confirmEnableUsers.description"
            defaultMessage="{count, plural, one{The user} other{These users}} will be enabled and will be able to access the stack{count, plural, one{.} other{:}}"
            values={{ count: usernames.length }}
          />
        </p>
        {usernames.length > 1 && (
          <ul>
            {usernames.map((username) => (
              <li key={username}>{username}</li>
            ))}
          </ul>
        )}
      </EuiText>
    </ConfirmModal>
  );
};

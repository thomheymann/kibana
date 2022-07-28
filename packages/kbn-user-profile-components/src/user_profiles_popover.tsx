/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiPopoverProps, EuiContextMenuPanelProps } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiPopover, EuiContextMenuPanel } from '@elastic/eui';

import { UserProfilesSelectable, UserProfilesSelectableProps } from './user_profiles_selectable';

export interface UserProfilesPopoverProps extends EuiPopoverProps {
  title?: EuiContextMenuPanelProps['title'];
  selectableProps: UserProfilesSelectableProps;
}

export const UserProfilesPopover: FunctionComponent<UserProfilesPopoverProps> = ({
  title,
  selectableProps,
  ...popoverProps
}) => {
  return (
    <EuiPopover panelPaddingSize="none" {...popoverProps}>
      <EuiContextMenuPanel title={title}>
        <UserProfilesSelectable {...selectableProps} />
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

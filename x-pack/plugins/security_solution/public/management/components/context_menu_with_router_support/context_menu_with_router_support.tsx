/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  CommonProps,
  EuiContextMenuPanel,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import {
  ContextMenuItemNavByRouter,
  ContextMenuItemNavByRouterProps,
} from './context_menu_item_nav_by_rotuer';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export interface ContextMenuWithRouterSupportProps
  extends CommonProps,
    Pick<EuiPopoverProps, 'button' | 'anchorPosition' | 'panelPaddingSize'> {
  items: ContextMenuItemNavByRouterProps[];
}

/**
 * A context menu that allows for items in the menu to route to other Kibana destinations using the Router
 * (thus avoiding full page refreshes).
 * Menu also supports automatically closing the popup when an item is clicked.
 */
export const ContextMenuWithRouterSupport = memo<ContextMenuWithRouterSupportProps>(
  ({ items, button, panelPaddingSize, anchorPosition, ...commonProps }) => {
    const getTestId = useTestIdGenerator(commonProps['data-test-subj']);
    const [isOpen, setIsOpen] = useState(false);

    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    const panelProps: EuiPopoverProps['panelProps'] = useMemo(() => {
      return { 'data-test-subj': getTestId('popoverPanel') };
    }, [getTestId]);

    const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
      return items.map((itemProps) => {
        return (
          <ContextMenuItemNavByRouter
            {...itemProps}
            onClick={(ev) => {
              handleCloseMenu();
              if (itemProps.onClick) {
                return itemProps.onClick(ev);
              }
            }}
          />
        );
      });
    }, [handleCloseMenu, items]);

    return (
      <EuiPopover
        {...commonProps}
        anchorPosition={anchorPosition}
        panelPaddingSize={panelPaddingSize}
        panelProps={panelProps}
        button={
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div className="eui-displayInlineBlock" onClick={handleToggleMenu}>
            {button}
          </div>
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
    );
  }
);
ContextMenuWithRouterSupport.displayName = 'ContextMenuWithRouterSupport';

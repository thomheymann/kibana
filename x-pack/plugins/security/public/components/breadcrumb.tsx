/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useEffect, useRef, useContext, FunctionComponent } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

interface BreadcrumbsContext {
  parents: BreadcrumbProps[];
  onMount(breadcrumbs: BreadcrumbProps[]): void;
  onUnmount(breadcrumbs: BreadcrumbProps[]): void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContext | undefined>(undefined);

export interface BreadcrumbProps extends EuiBreadcrumb {
  text: string;
}

/**
 * Component that automatically sets breadcrumbs and document title based on the render tree.
 *
 * @example
 * // Breadcrumbs will be set to: "Users > Create"
 * // Document title will be set to: "Create - Users"
 *
 * ```typescript
 * <Breadcrumb text="Users">
 *   <Table />
 *   {showForm && (
 *     <Breadcrumb text="Create">
 *       <Form />
 *     </Breadcrumb>
 *   )}
 * </Breadcrumb>
 * ```
 */
export const Breadcrumb: FunctionComponent<BreadcrumbProps> = ({ children, ...breadcrumb }) => {
  const context = useContext(BreadcrumbsContext);
  const component = <InnerBreadcrumb breadcrumb={breadcrumb}>{children}</InnerBreadcrumb>;

  if (context) {
    return component;
  }

  return <Breadcrumbs>{component}</Breadcrumbs>;
};

export interface BreadcrumbsProps {
  onChange?: BreadcrumbsChangeHandler;
}

export type BreadcrumbsChangeHandler = (breadcrumbs: BreadcrumbProps[]) => void;

/**
 * Component that can be used to define any side effects that should occur when breadcrumbs change.
 *
 * By default the breadcrumbs in application chrome are set and the document title is updated.
 *
 * @example
 * ```typescript
 * <Breadcrumbs onChange={(breadcrumbs) => setBreadcrumbs(breadcrumbs)}>
 *   <Breadcrumb text="Users" />
 * </Breadcrumbs>
 * ```
 */
export const Breadcrumbs: FunctionComponent<BreadcrumbsProps> = ({ children, onChange }) => {
  const { services } = useKibana();
  const breadcrumbsRef = useRef<BreadcrumbProps[]>([]);

  const handleChange = (breadcrumbs: BreadcrumbProps[]) => {
    if (onChange) {
      onChange(breadcrumbs);
    } else if (services.chrome) {
      services.chrome.setBreadcrumbs(breadcrumbs);
      services.chrome.docTitle.change(getDocTitle(breadcrumbs));
    }
  };

  return (
    <BreadcrumbsContext.Provider
      value={{
        parents: [],
        onMount: (breadcrumbs) => {
          if (breadcrumbs.length > breadcrumbsRef.current.length) {
            breadcrumbsRef.current = breadcrumbs;
            handleChange(breadcrumbs);
          }
        },
        onUnmount: (breadcrumbs) => {
          if (breadcrumbs.length < breadcrumbsRef.current.length) {
            breadcrumbsRef.current = breadcrumbs;
            handleChange(breadcrumbs);
          }
        },
      }}
    >
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export interface InnerBreadcrumbProps {
  breadcrumb: BreadcrumbProps;
}

export const InnerBreadcrumb: FunctionComponent<InnerBreadcrumbProps> = ({
  breadcrumb,
  children,
}) => {
  const { parents, onMount, onUnmount } = useContext(BreadcrumbsContext)!;
  const nextParents = [...parents, breadcrumb];

  useEffect(() => {
    onMount(nextParents);
    return () => onUnmount(parents);
  }, [breadcrumb.text, breadcrumb.href]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BreadcrumbsContext.Provider value={{ parents: nextParents, onMount, onUnmount }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export function getDocTitle(breadcrumbs: BreadcrumbProps[]) {
  return breadcrumbs
    .slice()
    .reverse()
    .map(({ text }) => text);
}

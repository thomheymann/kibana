/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const preparePack = (packName: string, savedQueryId: string) => {
  cy.contains('Packs').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

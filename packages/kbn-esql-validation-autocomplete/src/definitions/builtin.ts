/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionDefinition, FunctionParameterType, FunctionReturnType } from './types';

function createMathDefinition(
  name: string,
  types: Array<
    | (FunctionParameterType & FunctionReturnType)
    | [FunctionParameterType, FunctionParameterType, FunctionReturnType]
  >,
  description: string,
  validate?: FunctionDefinition['validate']
): FunctionDefinition {
  return {
    type: 'builtin',
    name,
    description,
    supportedCommands: ['eval', 'where', 'row', 'stats', 'metrics', 'sort'],
    supportedOptions: ['by'],
    signatures: types.map((type) => {
      if (Array.isArray(type)) {
        return {
          params: [
            { name: 'left', type: type[0] },
            { name: 'right', type: type[1] },
          ],
          returnType: type[2],
        };
      }
      return {
        params: [
          { name: 'left', type },
          { name: 'right', type },
        ],
        returnType: type,
      };
    }),
    validate,
  };
}

function createComparisonDefinition(
  {
    name,
    description,
    extraSignatures = [],
  }: {
    name: string;
    description: string;
    extraSignatures?: FunctionDefinition['signatures'];
  },
  validate?: FunctionDefinition['validate']
): FunctionDefinition {
  return {
    type: 'builtin' as const,
    name,
    description,
    supportedCommands: ['eval', 'where', 'row', 'sort'],
    supportedOptions: ['by'],
    validate,
    signatures: [
      {
        params: [
          { name: 'left', type: 'number' },
          { name: 'right', type: 'number' },
        ],
        returnType: 'boolean',
      },
      {
        params: [
          { name: 'left', type: 'string' },
          { name: 'right', type: 'string' },
        ],
        returnType: 'boolean',
      },
      {
        params: [
          { name: 'left', type: 'date' },
          { name: 'right', type: 'date' },
        ],
        returnType: 'boolean',
      },
      {
        params: [
          { name: 'left', type: 'ip' },
          { name: 'right', type: 'ip' },
        ],
        returnType: 'boolean',
      },
      {
        params: [
          { name: 'left', type: 'version' },
          { name: 'right', type: 'version' },
        ],
        returnType: 'boolean',
      },
      // constant strings okay because of implicit casting for
      // string to version and ip
      //
      // boolean casting is handled on the specific comparison function
      // that support booleans
      //
      // date casting is handled in the validation routine since it's a
      // general rule. Look in compareLiteralType()
      ...(['ip', 'version'] as const).flatMap((type) => [
        {
          params: [
            { name: 'left', type },
            { name: 'right', type: 'string' as const, constantOnly: true },
          ],
          returnType: 'boolean' as const,
        },
        {
          params: [
            { name: 'right', type: 'string' as const, constantOnly: true },
            { name: 'right', type },
          ],
          returnType: 'boolean' as const,
        },
      ]),
      ...extraSignatures,
    ],
  };
}

export const mathFunctions: FunctionDefinition[] = [
  createMathDefinition(
    '+',
    ['number', ['date', 'time_literal', 'date'], ['time_literal', 'date', 'date']],
    i18n.translate('kbn-esql-validation-autocomplete.esql.definition.addDoc', {
      defaultMessage: 'Add (+)',
    })
  ),
  createMathDefinition(
    '-',
    ['number', ['date', 'time_literal', 'date'], ['time_literal', 'date', 'date']],
    i18n.translate('kbn-esql-validation-autocomplete.esql.definition.subtractDoc', {
      defaultMessage: 'Subtract (-)',
    })
  ),
  createMathDefinition(
    '*',
    ['number'],
    i18n.translate('kbn-esql-validation-autocomplete.esql.definition.multiplyDoc', {
      defaultMessage: 'Multiply (*)',
    })
  ),
  createMathDefinition(
    '/',
    ['number'],
    i18n.translate('kbn-esql-validation-autocomplete.esql.definition.divideDoc', {
      defaultMessage: 'Divide (/)',
    }),
    (fnDef) => {
      const [left, right] = fnDef.args;
      const messages = [];
      if (!Array.isArray(left) && !Array.isArray(right)) {
        if (right.type === 'literal' && right.literalType === 'number') {
          if (right.value === 0) {
            messages.push({
              type: 'warning' as const,
              code: 'divideByZero',
              text: i18n.translate(
                'kbn-esql-validation-autocomplete.esql.divide.warning.divideByZero',
                {
                  defaultMessage: 'Cannot divide by zero: {left}/{right}',
                  values: {
                    left: left.text,
                    right: right.value,
                  },
                }
              ),
              location: fnDef.location,
            });
          }
        }
      }
      return messages;
    }
  ),
  createMathDefinition(
    '%',
    ['number'],
    i18n.translate('kbn-esql-validation-autocomplete.esql.definition.moduleDoc', {
      defaultMessage: 'Module (%)',
    }),
    (fnDef) => {
      const [left, right] = fnDef.args;
      const messages = [];
      if (!Array.isArray(left) && !Array.isArray(right)) {
        if (right.type === 'literal' && right.literalType === 'number') {
          if (right.value === 0) {
            messages.push({
              type: 'warning' as const,
              code: 'moduleByZero',
              text: i18n.translate(
                'kbn-esql-validation-autocomplete.esql.divide.warning.zeroModule',
                {
                  defaultMessage: 'Module by zero can return null value: {left}%{right}',
                  values: {
                    left: left.text,
                    right: right.value,
                  },
                }
              ),
              location: fnDef.location,
            });
          }
        }
      }
      return messages;
    }
  ),
];

const comparisonFunctions: FunctionDefinition[] = [
  {
    name: '==',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.equalToDoc', {
      defaultMessage: 'Equal to',
    }),
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
      // constant strings okay because of implicit casting
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'string' as const, constantOnly: true },
        ],
        returnType: 'boolean' as const,
      },
      {
        params: [
          { name: 'right', type: 'string' as const, constantOnly: true },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
    ],
  },
  {
    name: '!=',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.notEqualToDoc', {
      defaultMessage: 'Not equal to',
    }),
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
      // constant strings okay because of implicit casting
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'string' as const, constantOnly: true },
        ],
        returnType: 'boolean' as const,
      },
      {
        params: [
          { name: 'right', type: 'string' as const, constantOnly: true },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
    ],
  },
  {
    name: '<',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.lessThanDoc', {
      defaultMessage: 'Less than',
    }),
  },
  {
    name: '>',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.greaterThanDoc', {
      defaultMessage: 'Greater than',
    }),
  },
  {
    name: '<=',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definition.lessThanOrEqualToDoc',
      {
        defaultMessage: 'Less than or equal to',
      }
    ),
  },
  {
    name: '>=',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definition.greaterThanOrEqualToDoc',
      {
        defaultMessage: 'Greater than or equal to',
      }
    ),
  },
].map((op): FunctionDefinition => createComparisonDefinition(op));

const likeFunctions: FunctionDefinition[] = [
  // Skip the insensitive case equality until it gets restored back
  // new special comparison operator for strings only
  // {
  //   name: '=~',
  //   description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.equalToCaseInsensitiveDoc', {
  //     defaultMessage: 'Case insensitive equality',
  //   }),
  // },
  {
    name: 'like',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.likeDoc', {
      defaultMessage: 'Filter data based on string patterns',
    }),
  },
  { name: 'not_like', description: '' },
  {
    name: 'rlike',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.rlikeDoc', {
      defaultMessage: 'Filter data based on string regular expressions',
    }),
  },
  { name: 'not_rlike', description: '' },
].map(({ name, description }) => {
  const def: FunctionDefinition = {
    type: 'builtin' as const,
    ignoreAsSuggestion: /not/.test(name),
    name,
    description,
    supportedCommands: ['eval', 'where', 'row', 'sort'],
    supportedOptions: ['by'],
    signatures: [
      {
        params: [
          { name: 'left', type: 'string' as const },
          { name: 'right', type: 'string' as const },
        ],
        returnType: 'boolean',
      },
    ],
  };

  return def;
});

const inFunctions: FunctionDefinition[] = [
  {
    name: 'in',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.inDoc', {
      defaultMessage:
        'Tests if the value an expression takes is contained in a list of other expressions',
    }),
  },
  { name: 'not_in', description: '' },
].map<FunctionDefinition>(({ name, description }) => ({
  // set all arrays to type "any" for now
  // this only applies to the "in" operator
  // e.g. "foo" in ( "foo", "bar" )
  //
  // we did this because the "in" operator now supports
  // mixed-type arrays like ( "1.2.3", versionVar )
  // because of implicit casting.
  //
  // we need to revisit with more robust validation
  type: 'builtin',
  ignoreAsSuggestion: /not/.test(name),
  name,
  description,
  supportedCommands: ['eval', 'where', 'row', 'sort'],
  signatures: [
    {
      params: [
        { name: 'left', type: 'number' },

        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        { name: 'left', type: 'string' },
        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        { name: 'left', type: 'boolean' },
        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        { name: 'left', type: 'date' },
        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        { name: 'left', type: 'version' },
        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        { name: 'left', type: 'ip' },
        { name: 'right', type: 'any[]' },
      ],
      returnType: 'boolean',
    },
  ],
}));

const logicFunctions: FunctionDefinition[] = [
  {
    name: 'and',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.andDoc', {
      defaultMessage: 'and',
    }),
  },
  {
    name: 'or',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.orDoc', {
      defaultMessage: 'or',
    }),
  },
].map(({ name, description }) => ({
  type: 'builtin' as const,
  name,
  description,
  supportedCommands: ['eval', 'where', 'row', 'sort'],
  supportedOptions: ['by'],
  signatures: [
    {
      params: [
        { name: 'left', type: 'boolean' as const },
        { name: 'right', type: 'boolean' as const },
      ],
      returnType: 'boolean',
    },
  ],
}));

const nullFunctions: FunctionDefinition[] = [
  {
    name: 'is null',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.isNullDoc', {
      defaultMessage: 'Predicate for NULL comparison: returns true if the value is NULL',
    }),
  },
  {
    name: 'is not null',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.isNotNullDoc', {
      defaultMessage: 'Predicate for NULL comparison: returns true if the value is not NULL',
    }),
  },
].map<FunctionDefinition>(({ name, description }) => ({
  type: 'builtin',
  name,
  description,
  supportedCommands: ['eval', 'where', 'row', 'sort'],
  signatures: [
    {
      params: [{ name: 'left', type: 'any' }],
      returnType: 'boolean',
    },
  ],
}));

const otherDefinitions: FunctionDefinition[] = [
  {
    type: 'builtin' as const,
    name: 'not',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.notDoc', {
      defaultMessage: 'Not',
    }),
    supportedCommands: ['eval', 'where', 'row', 'sort'],
    supportedOptions: ['by'],
    signatures: [
      {
        params: [{ name: 'expression', type: 'boolean' }],
        returnType: 'boolean',
      },
    ],
  },
  {
    type: 'builtin' as const,
    name: '=',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.assignDoc', {
      defaultMessage: 'Assign (=)',
    }),
    supportedCommands: ['eval', 'stats', 'metrics', 'row', 'dissect', 'where', 'enrich'],
    supportedOptions: ['by', 'with'],
    signatures: [
      {
        params: [
          { name: 'left', type: 'any' },
          { name: 'right', type: 'any' },
        ],
        returnType: 'void',
      },
    ],
  },
  {
    name: 'functions',
    type: 'builtin',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.functionsDoc', {
      defaultMessage: 'Show ES|QL avaialble functions with signatures',
    }),
    supportedCommands: ['meta'],
    signatures: [
      {
        params: [],
        returnType: 'void',
      },
    ],
  },
  {
    name: 'info',
    type: 'builtin',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.infoDoc', {
      defaultMessage: 'Show information about the current ES node',
    }),
    supportedCommands: ['show'],
    signatures: [
      {
        params: [],
        returnType: 'void',
      },
    ],
  },
];

export const builtinFunctions: FunctionDefinition[] = [
  ...mathFunctions,
  ...comparisonFunctions,
  ...likeFunctions,
  ...inFunctions,
  ...logicFunctions,
  ...nullFunctions,
  ...otherDefinitions,
];

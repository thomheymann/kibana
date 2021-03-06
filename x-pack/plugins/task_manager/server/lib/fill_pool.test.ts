/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { fillPool } from './fill_pool';
import { TaskPoolRunResult } from '../task_pool';
import { asOk } from './result_type';

describe('fillPool', () => {
  test('stops filling when pool runs all claimed tasks, even if there is more capacity', async () => {
    const tasks = [
      [1, 2, 3],
      [4, 5],
    ];
    let index = 0;
    const fetchAvailableTasks = async () => asOk(tasks[index++] || []);
    const run = sinon.spy(async () => TaskPoolRunResult.RunningAllClaimedTasks);
    const converter = _.identity;

    await fillPool(fetchAvailableTasks, converter, run);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3]);
  });

  test('stops filling when the pool has no more capacity', async () => {
    const tasks = [
      [1, 2, 3],
      [4, 5],
    ];
    let index = 0;
    const fetchAvailableTasks = async () => asOk(tasks[index++] || []);
    const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
    const converter = _.identity;

    await fillPool(fetchAvailableTasks, converter, run);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3]);
  });

  test('calls the converter on the records prior to running', async () => {
    const tasks = [
      [1, 2, 3],
      [4, 5],
    ];
    let index = 0;
    const fetchAvailableTasks = async () => asOk(tasks[index++] || []);
    const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
    const converter = (x: number) => x.toString();

    await fillPool(fetchAvailableTasks, converter, run);

    expect(_.flattenDeep(run.args)).toEqual(['1', '2', '3']);
  });

  describe('error handling', () => {
    test('throws exception from fetchAvailableTasks', async () => {
      const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
      const converter = (x: number) => x.toString();

      try {
        const fetchAvailableTasks = async () => Promise.reject('fetch is not working');

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('fetch is not working');
        expect(run.called).toBe(false);
      }
    });

    test('throws exception from run', async () => {
      const run = sinon.spy(() => Promise.reject('run is not working'));
      const converter = (x: number) => x.toString();

      try {
        const tasks = [
          [1, 2, 3],
          [4, 5],
        ];
        let index = 0;
        const fetchAvailableTasks = async () => asOk(tasks[index++] || []);

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('run is not working');
      }
    });

    test('throws exception from converter', async () => {
      try {
        const tasks = [
          [1, 2, 3],
          [4, 5],
        ];
        let index = 0;
        const fetchAvailableTasks = async () => asOk(tasks[index++] || []);
        const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
        const converter = (x: number) => {
          throw new Error(`can not convert ${x}`);
        };

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('Error: can not convert 1');
      }
    });
  });
});

import concurrentConcat from '../../src/utils/concurrent-concat';
import { getDeepEqualTestScheduler, Test } from '../helper';
import { test } from 'tap';
import { delay } from 'rxjs/operators';
import { of } from 'rxjs';

test('check correct emitting order: ascending', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
    const input = '        --a 9ms b 9ms c--';
    const subscription = ' --^ 100ms - 9ms - 9ms !';
    const expect = '       --  100ms a 9ms b 9ms c';

    const values = {
      a: { delayTime: 100, value: 'a' },
      b: { delayTime: 100, value: 'b' },
      c: { delayTime: 100, value: 'c' },
    };
    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concurrentConcat((value) => {
        return of(value.value).pipe(delay(value.delayTime));
      }, 3),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
    expectSubscriptions(source.subscriptions).toBe(subscription);
  });
});

test('check correct emitting order: descending', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
    const input = '        --a 9ms b 9ms c--';
    const subscription = ' --^ 100ms ----!';
    const expect = '       --  100ms (abc)';

    const values = {
      a: { delayTime: 100, value: 'a' },
      b: { delayTime: 50, value: 'b' },
      c: { delayTime: 25, value: 'c' },
    };
    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concurrentConcat((value) => {
        return of(value.value).pipe(delay(value.delayTime));
      }, 3),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
    expectSubscriptions(source.subscriptions).toBe(subscription);
  });
});

test('check correct emitting order: error', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable }) => {
    const input = '        --a 9ms b-# 7ms c--';
    const subscription = ' --^ 9ms ---!';
    const expect = '       --- 9ms --#';

    const values = {
      a: { delayTime: 100, value: 'a' },
      b: { delayTime: 50, value: 'b' },
      c: { delayTime: 25, value: 'c' },
    };
    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concurrentConcat((value) => {
        return of(value.value).pipe(delay(value.delayTime));
      }, 3),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
  });
});

test('check correct emitting order: complete', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable }) => {
    const input = '        --a 9ms b| 7ms c--';
    const subscription = ' --^ 100ms ----!';
    const expect = '       --  100ms (ab|)';

    const values = {
      a: { delayTime: 100, value: 'a' },
      b: { delayTime: 50, value: 'b' },
      c: { delayTime: 25, value: 'c' },
    };
    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concurrentConcat((value) => {
        return of(value.value).pipe(delay(value.delayTime));
      }, 3),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
  });
});

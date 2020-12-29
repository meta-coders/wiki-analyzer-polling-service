import retryBackoff from '../../src/utils/retry-backoff';
import { getDeepEqualTestScheduler, Test } from '../helper';
import { test } from 'tap';
import { concatMap } from 'rxjs/operators';
import { defer, of, throwError } from 'rxjs';

test('check error handling: positive test', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
    const input = '       --a 9ms b 9ms c--';
    const subscription = '--^ 54ms - 14ms   -!';
    const expect = '      --- 54ms a 14ms (bc)';

    const values = {
      a: { errorsNumber: 2, value: 'a' },
      b: { errorsNumber: 1, value: 'b' },
      c: { errorsNumber: 0, value: 'c' },
    };
    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concatMap((val) => {
        let { errorsNumber } = val;
        return defer(() => {
          if (errorsNumber > 0) {
            errorsNumber--;
            return throwError('Oops');
          }
          return of(val.value);
        }).pipe(retryBackoff({ initialInterval: 15 }));
      }),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
    expectSubscriptions(source.subscriptions).toBe(subscription);
  });
});

test('check error handling: maxRetries', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable }) => {
    const input = '       --a 9ms b 9ms c--';
    const subscription = '--^ 55ms 9ms - 54ms -!';
    const expect = '      --a 55ms 9ms b 54ms #';

    const values = {
      a: { errorsNumber: 0, value: 'a' },
      b: { errorsNumber: 2, value: 'b' },
      c: { errorsNumber: 4, value: 'c' },
    };

    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concatMap((val) => {
        let { errorsNumber } = val;
        return defer(() => {
          if (errorsNumber > 0) {
            errorsNumber--;
            return throwError('error');
          }
          return of(val.value);
        }).pipe(retryBackoff({ initialInterval: 15, maxRetries: 2 }));
      }),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
  });
});

test('check error handling: maxInterval', async (t: Test) => {
  const testScheduler = await getDeepEqualTestScheduler(t);

  testScheduler.run(({ hot, expectObservable }) => {
    const input = '       --a 9ms b 9ms c--';
    const subscription = '--^ 24ms - 14ms -!';
    const expect = '      --a 24ms b 14ms #';

    const values = {
      a: { errorsNumber: 0, value: 'a' },
      b: { errorsNumber: 1, value: 'b' },
      c: { errorsNumber: 2, value: 'c' },
    };

    const source = hot(input, values);
    const concurrentSource = source.pipe(
      concatMap((val) => {
        let { errorsNumber } = val;
        return defer(() => {
          if (errorsNumber > 0) {
            errorsNumber--;
            return throwError('error');
          }
          return of(val.value);
        }).pipe(retryBackoff({ initialInterval: 15, maxInterval: 30 }));
      }),
    );

    expectObservable(concurrentSource, subscription).toBe(expect);
  });
});

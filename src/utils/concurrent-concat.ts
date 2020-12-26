import {
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  pipe,
  Subscriber,
} from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface IndexedValue<T> {
  index: number;
  value: T;
}

function sortByIndex<
  T,
  R extends IndexedValue<T>
>(): MonoTypeOperatorFunction<R> {
  return (observable: Observable<R>) => {
    return new Observable((subscriber: Subscriber<R>) => {
      const buffer = new Map<number, R>();
      let current = 0;
      const subscription = observable.subscribe({
        next: (value) => {
          if (current !== value.index) {
            buffer.set(value.index, value);
          } else {
            subscriber.next(value);
            while (buffer.has(++current)) {
              subscriber.next(buffer.get(current));
              buffer.delete(current);
            }
          }
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          subscriber.complete();
        },
      });

      return subscription;
    });
  };
}

export default function concurrentConcat<T, R>(
  mapper: (value: T, index: number) => Observable<R>,
  concurrent?: number,
): OperatorFunction<T, R> {
  return pipe(
    mergeMap(mapper, concurrent),
    map((value: R, index: number): IndexedValue<R> => ({ value, index })),
    sortByIndex(),
    map(({ value }) => value),
  );
}

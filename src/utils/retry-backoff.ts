import { MonoTypeOperatorFunction, Observable, throwError, timer } from 'rxjs';
import { concatMap, retryWhen } from 'rxjs/operators';

const getInterval = (initialInterval: number, attempt: number) => {
  return Math.floor(initialInterval * Math.exp(attempt));
};

export interface RetryBackoffConfig {
  // Initial interval. It will eventually go as high as maxInterval.
  initialInterval: number;
  // Maximum number of retry attempts.
  maxRetries?: number;
  // Maximum delay between retries.
  maxInterval?: number;
}

export default function retryBackoff<T>(
  config: RetryBackoffConfig,
): MonoTypeOperatorFunction<T> {
  return (input: Observable<T>) => {
    const { initialInterval, maxRetries, maxInterval } = config;
    return input.pipe(
      retryWhen((errors) => {
        return errors.pipe(
          concatMap((error, attempt) => {
            const retryAttempt = attempt + 1;
            const interval = getInterval(initialInterval, attempt);

            if (
              (maxRetries && retryAttempt > maxRetries) ||
              (maxInterval && maxInterval < interval)
            ) {
              return throwError(error);
            }

            return timer(interval);
          }),
        );
      }),
    );
  };
}

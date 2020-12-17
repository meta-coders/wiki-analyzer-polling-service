import EventSource from 'eventsource';
import { defer, Observable, ReplaySubject } from 'rxjs';
import { delay, multicast, refCount, retryWhen } from 'rxjs/operators';

const RETRY_DELAY = 1000;
const CACHE_SIZE = 5;

export default class WikiEventSource {
  constructor(private readonly url: string) {}

  // TODO Message interface
  public connect(): Observable<any> {
    return defer(() => {
      return new Observable((subscriber) => {
        console.log(
          `[WikiEventSource]: Connecting to EventStreams at ${this.url}`,
        );
        const source = new EventSource(this.url);

        source.onopen = () => {
          console.log(
            `[WikiEventSource]: EventStreams connected at ${this.url}`,
          );
        };

        source.onerror = (event: MessageEvent<string>) => {
          console.error('[WikiEventSource]: Connection error occurred:', event);
          subscriber.error(event);
        };

        source.onmessage = (event: MessageEvent<string>) => {
          console.log('[WikiEventSource]: Incoming event:', event);
          try {
            const message = JSON.parse(event.data);
            subscriber.next(message);
          } catch (error) {
            console.error(
              '[WikiEventSource]: Parsing event error occurred:',
              error,
            );
            subscriber.error(error);
          }
        };

        subscriber.complete();

        return () => {
          source.close();
          console.log('[WikiEventSource]: Connection to EventStreams closed');
        };
      });
    }).pipe(
      // TODO: Add exponential backoff
      retryWhen((errors) => errors.pipe(delay(RETRY_DELAY))),
      multicast(new ReplaySubject(CACHE_SIZE), refCount()),
    );
  }
}

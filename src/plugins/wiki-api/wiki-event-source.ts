import EventSource from 'eventsource';
import { defer, Observable, Subscriber } from 'rxjs';
import WikiEvent, {
  WikiEventType,
  WikiNamespace,
} from '../../interfaces/WikiEvent';

export default class WikiEventSource {
  constructor(private readonly url: string) {}

  public connect(): Observable<WikiEvent> {
    return defer(() => {
      return new Observable((subscriber: Subscriber<WikiEvent>) => {
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
          console.error(
            '[WikiEventSource]: Connection error occurred:',
            JSON.stringify(event),
          );
          subscriber.error(event);
        };

        source.onmessage = (event: MessageEvent<string>) => {
          // console.log('[WikiEventSource]: Incoming event:', JSON.stringify(event));
          try {
            // TODO: add better parsing
            const message = JSON.parse(event.data);
            if (this.filterEvent(message)) {
              subscriber.next(message);
            }
          } catch (error) {
            console.error(
              '[WikiEventSource]: Parsing event error occurred:',
              error,
            );
            subscriber.error(error);
          }
        };

        return () => {
          source.close();
          console.log('[WikiEventSource]: Connection to EventStreams closed');
        };
      });
    });
  }

  private filterEvent(event: any): event is WikiEvent {
    return (
      event &&
      event.type &&
      Object.values(WikiEventType).includes(event.type) &&
      event.namespace &&
      event.namespace in WikiNamespace
    );
  }
}

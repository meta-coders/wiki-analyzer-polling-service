import EventSource from 'eventsource';
import { defer, Observable, Subscriber } from 'rxjs';
import { skipWhile, tap } from 'rxjs/operators';
import WikiEvent, {
  WikiEventType,
  WikiNamespace,
} from '../../interfaces/WikiEvent';
import {
  mapEventToWikiEditEvent,
  mapEventToWikiNewEvent,
  mapEventToWikiLogEvent,
  mapEventToWikiCategorizeEvent,
  mapEventToWikiExternalEvent,
} from '../../utils/wiki-event-mappers';

const mapers = {
  [WikiEventType.EDIT]: mapEventToWikiEditEvent,
  [WikiEventType.NEW]: mapEventToWikiNewEvent,
  [WikiEventType.LOG]: mapEventToWikiLogEvent,
  [WikiEventType.CATEGORIZE]: mapEventToWikiCategorizeEvent,
  [WikiEventType.EXTERNAL]: mapEventToWikiExternalEvent,
};

export default abstract class BaseWikiEventSource {
  constructor(protected readonly url: string) {}

  public connect(): Observable<WikiEvent> {
    return defer(() => {
      return new Observable((subscriber: Subscriber<WikiEvent>) => {
        const source = this.getSource();

        source.onopen = this.onOpenHandler();
        source.onerror = this.onErrorHandler(subscriber);
        source.onmessage = this.onMessageHandler(subscriber);

        return () => {
          source.close();
          console.log(`[WikiEventSource]: Connection to EventStreams closed`);
        };
      });
    });
  }

  protected abstract getSource(): EventSource;

  private onOpenHandler() {
    return () => {
      console.log(`[WikiEventSource]: EventStreams connected at ${this.url}`);
    };
  }

  private onErrorHandler(subscriber: Subscriber<WikiEvent>) {
    return (event: MessageEvent<string>) => {
      console.error(
        `[WikiEventSource]: Connection error occurred: ${JSON.stringify(
          event,
        )}`,
      );
      subscriber.error(
        new Error('Connection error occurred to the event source'),
      );
    };
  }

  private onMessageHandler(subscriber: Subscriber<WikiEvent>) {
    return (event: MessageEvent<string>) => {
      // console.log(`[WikiEventSource]: Incoming event: ${JSON.stringify(event)}`);
      try {
        const message = JSON.parse(event.data);
        if (this.filterEvent(message)) {
          const maper = mapers[message.type];
          if (!!maper) {
            subscriber.next(maper(message));
          }
        }
      } catch (error) {
        console.error(
          `[WikiEventSource]: Parsing event error occurred: ${error}`,
        );
        subscriber.error(error);
      }
    };
  }

  private filterEvent(event: any): event is WikiEvent {
    return event && event?.type && event?.namespace in WikiNamespace;
  }
}

export class WikiEventSource extends BaseWikiEventSource {
  constructor(url: string) {
    super(url);
  }

  protected getSource(): EventSource {
    console.log(`[WikiEventSource]: Connecting to EventStreams at ${this.url}`);
    return new EventSource(this.url);
  }
}

export class WikiEventSourceSinceDate extends BaseWikiEventSource {
  constructor(url: string, private startDate: Date = new Date()) {
    super(url);
  }

  public connect(): Observable<WikiEvent> {
    let lastEventId: string | null = null;
    let lastSkippedEventId: string | null = null;
    return super.connect().pipe(
      skipWhile((event) => {
        if (lastEventId === null) {
          return false;
        }
        const skip = lastSkippedEventId !== lastEventId;
        lastSkippedEventId = skip ? event.meta.id : null;
        return skip;
      }),
      tap((event) => {
        this.startDate = new Date(event.timestamp * 1000);
        lastEventId = event.meta.id;
      }),
    );
  }

  protected getSource(): EventSource {
    console.log(`[WikiEventSource]: Connecting to EventStreams at ${this.url}`);
    return new EventSource(`${this.url}?since=${this.startDate.toISOString()}`);
  }
}

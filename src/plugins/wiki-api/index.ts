import fp from 'fastify-plugin';
import { defer, Observable, of } from 'rxjs';
import {
  concatMap,
  delay,
  retryWhen,
  share,
  windowCount,
} from 'rxjs/operators';
import { URL } from 'url';
import DetailedWikiEvent from '../../interfaces/DetailedWikiEvent';
import WikiEvent, { WikiEventType } from '../../interfaces/WikiEvent';
import concurrentConcat from '../../utils/concurrent-concat';
import { mapWikiEditEventToDetailedWikiEditEvent } from '../../utils/detailed-wiki-event-mappers';
import retryBackoff from '../../utils/retry-backoff';
import BaseWikiEventSource, {
  WikiEventSource,
  WikiEventSourceSinceDate,
} from './wiki-event-source';

const RETRY_DELAY = 1000;
const WINDOW_COUNT = 250;

const MAX_REQ_RETRY_ATTEMPTS = 5;
const REQ_RETRY_DELAY = 1000;

export class WikiApiService {
  private readonly eventStream: Observable<WikiEvent>;
  private readonly url: string;
  private readonly wikiEventSource: BaseWikiEventSource;

  constructor(url: string) {
    this.url = new URL(url).href;
    this.wikiEventSource = new WikiEventSource(this.url);
    this.eventStream = this.wikiEventSource.connect().pipe(
      retryWhen((errors) => {
        return errors.pipe(delay(RETRY_DELAY));
      }),
      share(),
    );
  }

  public getEventStream(): Observable<WikiEvent> {
    return this.eventStream;
  }

  public getDetailedRecentChanges(since: Date): Observable<DetailedWikiEvent> {
    const eventSource = new WikiEventSourceSinceDate(this.url, since);

    return eventSource.connect().pipe(
      retryWhen((errors) => {
        return errors.pipe(delay(RETRY_DELAY));
      }),
      windowCount(WINDOW_COUNT),
      concatMap((windowEvents: Observable<WikiEvent>) => {
        return windowEvents.pipe(
          concurrentConcat(
            (event: WikiEvent): Observable<DetailedWikiEvent> => {
              if (event.type === WikiEventType.EDIT) {
                return defer(() =>
                  mapWikiEditEventToDetailedWikiEditEvent(event),
                ).pipe(
                  retryBackoff({
                    initialInterval: REQ_RETRY_DELAY,
                    maxRetries: MAX_REQ_RETRY_ATTEMPTS,
                  }),
                );
              }
              return of(event);
            },
          ),
        );
      }),
    );
  }
}

export interface WikiApiServiceOptions {
  url: string;
}

export const autoConfig: WikiApiServiceOptions = {
  url:
    process.env.WIKI_API ||
    'https://stream.wikimedia.org/v2/stream/recentchange',
};

export default fp<WikiApiServiceOptions>(async (fastify, options) => {
  const wikiApiService = new WikiApiService(options.url);
  fastify.decorate('wikiApiService', wikiApiService);
});

declare module 'fastify' {
  export interface FastifyInstance {
    wikiApiService: WikiApiService;
  }
}

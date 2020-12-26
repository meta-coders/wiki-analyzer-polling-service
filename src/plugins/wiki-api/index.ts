import fp from 'fastify-plugin';
import { defer, Observable, of } from 'rxjs';
import { concatMap, share, windowCount } from 'rxjs/operators';
import DetailedWikiEvent from '../../interfaces/DetailedWikiEvent';
import WikiEvent, { WikiEventType } from '../../interfaces/WikiEvent';
import concurrentConcat from '../../utils/concurrentConcat';
import { mapWikiEditEventToDetailedWikiEditEvent } from '../../utils/detailed-wiki-event-mappers';
import retryBackoff from '../../utils/retry-backoff';
import BaseWikiEventSource, {
  WikiEventSource,
  WikiEventSourceSinceDate,
} from './wiki-event-source';

export interface WikiApiServiceOptions {
  url: string;
}

export const autoConfig = {
  url: 'https://stream.wikimedia.org/v2/stream/recentchange',
};

const MAX_RETRY_ATTEMPTS = 10;
const RETRY_DELAY = 1000;

const MAX_REQ_RETRY_ATTEMPTS = 5;
const REQ_RETRY_DELAY = 1000;

export class WikiApiService {
  private readonly wikiEventSource: BaseWikiEventSource;
  private readonly eventStream: Observable<WikiEvent>;

  constructor(private readonly url: string) {
    this.wikiEventSource = new WikiEventSource(this.url);
    this.eventStream = this.wikiEventSource
      .connect()
      .pipe(
        retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
        share(),
      );
  }

  public getEventStream(): Observable<WikiEvent> {
    return this.eventStream;
  }

  public getDetailedRecentChanges(since: Date): Observable<DetailedWikiEvent> {
    const eventSource = new WikiEventSourceSinceDate(this.url, since);

    return eventSource.connect().pipe(
      retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
      windowCount(250),
      concatMap((windowEvents: Observable<WikiEvent>) => {
        return windowEvents.pipe(
          concurrentConcat(
            (event: WikiEvent): Observable<DetailedWikiEvent> => {
              if (event.type === WikiEventType.EDIT) {
                return defer(() =>
                  mapWikiEditEventToDetailedWikiEditEvent(event),
                ).pipe(
                  retryBackoff(
                    MAX_REQ_RETRY_ATTEMPTS,
                    REQ_RETRY_DELAY,
                    'WikiApiServiceRequest:' + event.meta.id,
                  ),
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

export default fp<WikiApiServiceOptions>(async (fastify, options) => {
  const wikiApiService = new WikiApiService(options.url);
  fastify.decorate('wikiApiService', wikiApiService);
});

declare module 'fastify' {
  export interface FastifyInstance {
    wikiApiService: WikiApiService;
  }
}

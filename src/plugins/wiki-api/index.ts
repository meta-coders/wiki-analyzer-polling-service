import fp from 'fastify-plugin';
import { defer, Observable, of } from 'rxjs';
import { concatMap, filter, share, switchMap } from 'rxjs/operators';
import DetailedWikiEvent from '../../interfaces/DetailedWikiEvent';
import WikiEvent, { WikiEventType } from '../../interfaces/WikiEvent';
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

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 1000;

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

  public getUsersEventStream(
    users: Observable<string[]>,
  ): Observable<WikiEvent> {
    return users.pipe(
      switchMap((usernames: string[]) => {
        return this.eventStream.pipe(
          filter((event): boolean => {
            return usernames.includes(event.user);
          }),
        );
      }),
    );
  }

  public getDetailedRecentChanges(since: Date): Observable<DetailedWikiEvent> {
    const eventSource = new WikiEventSourceSinceDate(this.url, since);
    return eventSource.connect().pipe(
      retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
      concatMap((event: WikiEvent) => {
        if (event.type === WikiEventType.EDIT) {
          // batch processing
          return defer(() =>
            mapWikiEditEventToDetailedWikiEditEvent(event),
          ).pipe(
            retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
          );
        }
        return of(event);
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

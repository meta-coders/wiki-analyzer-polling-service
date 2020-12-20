import fp from 'fastify-plugin';
import { defer, Observable } from 'rxjs';
import { concatMap, filter, share, switchMap } from 'rxjs/operators';
import DetailedWikiEvent, {
  DetailedWikiEditEvent,
} from '../../interfaces/DetailedWikiEvent';
import WikiEvent, { WikiEventType } from '../../interfaces/WikiEvent';
import retryBackoff from '../../utils/retry-backoff';
import wikiCompare from './wiki-compare';
import WikiEventSource from './wiki-event-source';
import wikiPageExistence from './wiki-page-existence';

export interface WikiApiServiceOptions {
  url: string;
}

export const autoConfig = {
  url: 'https://stream.wikimedia.org/v2/stream/recentchange',
};

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 1000;

export class WikiApiService {
  private readonly wikiEventSource: WikiEventSource;
  private readonly eventStream: Observable<WikiEvent>;

  constructor(url: string) {
    this.wikiEventSource = new WikiEventSource(url);
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

  // TODO: https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&format=json&prop=revisions&titles=Pet_door&formatversion=2&rvprop=content
  public getDetailedRecentChanges(
    since: Date = new Date(),
  ): Observable<DetailedWikiEvent> {
    return this.wikiEventSource.connect(since).pipe(
      concatMap((event: WikiEvent) => {
        return defer(async () => {
          if (event.type === WikiEventType.EDIT) {
            // TODO: batch processing
            const isExist = await wikiPageExistence(event);
            if (isExist) {
              const diff = await wikiCompare(event);
              (event as DetailedWikiEditEvent).revision.diff = diff;
            }
            (event as DetailedWikiEditEvent).revision.missing = !isExist;
            return event as DetailedWikiEditEvent;
          }
          return event;
        }).pipe(
          retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
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

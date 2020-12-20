import fp from 'fastify-plugin';
import { from, Observable, of } from 'rxjs';
import { concatMap, filter, share, switchMap } from 'rxjs/operators';
import DetailedWikiEvent, {
  DetailedWikiEditEvent,
} from '../../interfaces/DetailedWikiEvent';
import WikiEvent, {
  WikiEditEvent,
  WikiEventType,
} from '../../interfaces/WikiEvent';
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
        if (event.type === WikiEventType.EDIT) {
          return from(this.getPageDifference(event)).pipe(
            retryBackoff(MAX_RETRY_ATTEMPTS, RETRY_DELAY, 'WikiApiService'),
          );
        }
        return of(event);
      }),
    );
  }

  private async getPageDifference(
    editEvent: WikiEditEvent,
  ): Promise<DetailedWikiEditEvent> {
    // TODO: batch processing
    const isExist = await wikiPageExistence(editEvent);
    if (isExist) {
      const diff = await wikiCompare(editEvent);
      (editEvent as DetailedWikiEditEvent).revision.diff = diff;
    }
    (editEvent as DetailedWikiEditEvent).revision.missing = !isExist;
    return editEvent as DetailedWikiEditEvent;
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

import fp from 'fastify-plugin';
import { Observable } from 'rxjs';
import { delay, filter, retryWhen, share, switchMap } from 'rxjs/operators';
import WikiEvent from '../../interfaces/WikiEvent';
import WikiEventSource from './wiki-event-source';

export interface WikiApiServiceOptions {
  url: string;
}

export const autoConfig = {
  url: 'https://stream.wikimedia.org/v2/stream/recentchange',
};

const RETRY_DELAY = 1000;

export class WikiApiService {
  private readonly eventStream: Observable<WikiEvent>;

  constructor(url: string) {
    const source = new WikiEventSource(url);

    this.eventStream = source.connect().pipe(
      // TODO: Add exponential backoff
      retryWhen((errors) => errors.pipe(delay(RETRY_DELAY))),
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

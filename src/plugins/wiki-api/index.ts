import fp from 'fastify-plugin';
import { Observable, ReplaySubject } from 'rxjs';
import { delay, multicast, refCount, retryWhen } from 'rxjs/operators';
import WikiEventSource from './wiki-event-source';

export interface WikiApiServiceOptions {
  url: string;
}

export const autoConfig = {
  url: 'https://stream.wikimedia.org/v2/stream/recentchange',
};

const RETRY_DELAY = 1000;
const CACHE_SIZE = 5;

export class WikiApiService {
  private readonly eventStream: Observable<any>;

  constructor(url: string) {
    const source = new WikiEventSource(url);
    this.eventStream = source.connect().pipe(
      // TODO: Add exponential backoff
      retryWhen((errors) => errors.pipe(delay(RETRY_DELAY))),
      multicast(new ReplaySubject(CACHE_SIZE), refCount()),
    );
  }

  public getEventStream() {
    return this.eventStream;
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

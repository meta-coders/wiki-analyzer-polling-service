import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { EMPTY, fromEvent, of } from 'rxjs';
import { concatMap, filter, map, pluck, switchMap } from 'rxjs/operators';
import WebSocket from 'ws';
import subscribeClient from '../utils/subscribe-client';

const detailedRecentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/detailed-recent-changes',
    { websocket: true },
    function detailedRecentChangesHandler(connection) {
      const socket: WebSocket = connection.socket;

      const eventStream = fromEvent(socket, 'message').pipe(
        pluck('data'),
        filter((message): message is string => typeof message === 'string'),
        concatMap((message) => {
          const date = Date.parse(message);
          if (date === NaN) {
            return EMPTY;
          }
          return of(new Date(date));
        }),
        switchMap((date) => {
          return this.wikiApiService.getDetailedRecentChanges(date);
        }),
        map((wikiEvent) => JSON.stringify(wikiEvent)),
      );

      subscribeClient(eventStream, socket);
    },
  );
};

export default detailedRecentChanges;

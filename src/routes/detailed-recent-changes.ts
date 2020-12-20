import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { EMPTY, fromEvent, of } from 'rxjs';
import { concatMap, filter, pluck, switchMap } from 'rxjs/operators';
import WebSocket from 'ws';

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
      );

      const subscribtion = eventStream.subscribe({
        next: (message) => {
          if (socket.readyState !== WebSocket.OPEN) {
            return;
          }
          socket.send(JSON.stringify(message));
        },
        error: (error) => {
          // TODO: error.code
          socket.close(1014, error.message);
        },
        complete: () => {
          socket.close();
        },
      });

      socket.on('close', () => {
        subscribtion.unsubscribe();
      });
    },
  );
};

export default detailedRecentChanges;

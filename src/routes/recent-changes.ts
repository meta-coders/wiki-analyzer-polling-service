import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { map } from 'rxjs/operators';
import WebSocket from 'ws';
import subscribeClient from '../utils/subscribe-client';

const recentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/recent-changes',
    { websocket: true },
    function recentChangesHandler(connection) {
      const socket: WebSocket = connection.socket;
      const eventStream = this.wikiApiService
        .getEventStream()
        .pipe(map((wikiEvent) => JSON.stringify(wikiEvent)));

      subscribeClient(eventStream, socket);
    },
  );
};

export default recentChanges;

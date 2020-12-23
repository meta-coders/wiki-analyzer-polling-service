import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';

const recentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/recent-changes',
    { websocket: true },
    function recentChangesHandler(connection) {
      const socket = connection.socket;
      const eventStream = this.wikiApiService.getEventStream();

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

export default recentChanges;

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { EMPTY, fromEvent, Observable, of, OperatorFunction } from 'rxjs';
import { concatMap, filter, map, pluck } from 'rxjs/operators';
import WebSocket from 'ws';

function validateMessage(): OperatorFunction<any, string | string[]> {
  return (input: Observable<any>) => {
    return input.pipe(
      filter((users): users is string | string[] => {
        return (
          !!users &&
          (typeof users === 'string' ||
            (Array.isArray(users) && users.every((u) => typeof u === 'string')))
        );
      }),
    );
  };
}

function mapUsersToArray(): OperatorFunction<string | string[], string[]> {
  return (input: Observable<string | string[]>) => {
    return input.pipe(
      map((message: string | string[]): string[] => {
        if (Array.isArray(message)) {
          return message;
        }
        return [message];
      }),
    );
  };
}

// TODO move to another microservice
const usersRecentChanges: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get(
    '/users-recent-changes',
    { websocket: true },
    function usersRecentChangesHandler(connection) {
      const socket: WebSocket = connection.socket;

      const users = fromEvent(socket, 'message').pipe(
        pluck('data'),
        filter((message): message is string => typeof message === 'string'),
        concatMap((message) => {
          try {
            return of(JSON.parse(message));
          } catch {
            return EMPTY;
          }
        }),
        validateMessage(),
        mapUsersToArray(),
      );

      const eventStream = this.wikiApiService.getUsersEventStream(users);

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

export default usersRecentChanges;

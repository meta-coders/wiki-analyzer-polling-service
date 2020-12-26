import { Observable } from 'rxjs';
import WebSocket from 'ws';
import { WebSocketCodes } from './errors';

export default function subscribeClient<T>(
  stream: Observable<T>,
  socket: WebSocket,
) {
  const subscribtion = stream.subscribe({
    next: (event) => {
      socket.send(event);
    },
    error: () => {
      socket.close(WebSocketCodes.INTERNAL_ERROR);
    },
    complete: () => {
      socket.close();
    },
  });

  socket.on('close', () => {
    subscribtion.unsubscribe();
  });
}

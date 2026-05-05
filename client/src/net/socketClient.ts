import { io, Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '../../../shared/events';
import { SERVER_URL, SOCKET_TIMEOUT_MS } from './config';

export type TypedSocket = Socket<ServerToClient, ClientToServer>;

let instance: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!instance) {
    instance = io(SERVER_URL, {
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      timeout: 10_000,
    }) as TypedSocket;
  }
  return instance;
}

export function disposeSocket(): void {
  if (instance) {
    instance.removeAllListeners();
    instance.disconnect();
    instance = null;
  }
}

export class SocketEmitError extends Error {
  constructor(
    public readonly event: string,
    message: string
  ) {
    super(message);
    this.name = 'SocketEmitError';
  }
}

type AckResult<T> = { ok: true; data?: T; msg?: string } | { ok: false; msg: string };

/**
 * Emit with a timeout. Server ack signature: (ok, msg?, data?).
 * Returns a discriminated result; never rejects.
 */
export function emitAck<T = unknown>(
  socket: TypedSocket,
  event: keyof ClientToServer & string,
  payload: unknown,
  timeoutMs: number = SOCKET_TIMEOUT_MS
): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, msg: `Socket emit "${event}" timed out` });
    }, timeoutMs);

    type AckFn = (ok: unknown, msg?: unknown, data?: unknown) => void;
    const ack: AckFn = (ok, msg, data) => {
      clearTimeout(timer);
      if (ok) {
        resolve({ ok: true, data: data as T, msg: msg as string | undefined });
      } else {
        resolve({ ok: false, msg: (msg as string) || 'Request failed' });
      }
    };

    (socket.emit as unknown as (e: string, p: unknown, ack: AckFn) => void)(event, payload, ack);
  });
}

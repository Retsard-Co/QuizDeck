import { PresentationSession } from '../domain/types';

const CHANNEL_NAME = 'quizdeck-presenter-sync-v1';

export type SyncMessage =
  | { type: 'STATE_UPDATE'; session: PresentationSession; senderId: string; timestamp: number }
  | { type: 'REQUEST_STATE'; sessionId: string; senderId: string; timestamp: number }
  | { type: 'HEARTBEAT'; sessionId: string; senderId: string; role: 'host' | 'display'; timestamp: number }
  | { type: 'SESSION_ENDED'; sessionId: string; senderId: string; timestamp: number };

export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

export class PresenterSyncChannel {
  private channel: BroadcastChannel | null = null;
  private readonly senderId: string;

  constructor(onMessage: (msg: SyncMessage) => void) {
    this.senderId = `win-${Math.random().toString(36).slice(2, 10)}`;
    if (isBroadcastChannelSupported()) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const data = event.data;
        if (!data || data.senderId === this.senderId) return;
        onMessage(data);
      };
    }
  }

  public get supported(): boolean {
    return this.channel !== null;
  }

  public broadcastState(session: PresentationSession): void {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'STATE_UPDATE',
      session,
      senderId: this.senderId,
      timestamp: Date.now(),
    } satisfies SyncMessage);
  }

  public requestState(sessionId: string): void {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'REQUEST_STATE',
      sessionId,
      senderId: this.senderId,
      timestamp: Date.now(),
    } satisfies SyncMessage);
  }

  public sendHeartbeat(sessionId: string, role: 'host' | 'display'): void {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'HEARTBEAT',
      sessionId,
      senderId: this.senderId,
      role,
      timestamp: Date.now(),
    } satisfies SyncMessage);
  }

  public broadcastEnded(sessionId: string): void {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'SESSION_ENDED',
      sessionId,
      senderId: this.senderId,
      timestamp: Date.now(),
    } satisfies SyncMessage);
  }

  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

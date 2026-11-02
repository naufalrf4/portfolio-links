import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { createAbortSignal } from '@naufalrf/http';

type Status = 'connecting' | 'connected' | 'disconnected';

type PresenceParticipant = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  isTouching: boolean;
  pageLabel: string;
  sectionLabel: string | null;
};

type PresenceMessage =
  | { type: 'welcome'; payload: { selfId: string; roomId: string } }
  | { type: 'overview'; payload: { participants: PresenceParticipant[] } };

type LivePresencePillProps = {
  socketUrl: string;
  pagePath: string;
  pageLabel: string;
};

const HEARTBEAT_MS = 5000;
const RECONNECT_DELAY_MS = 5000;
const HEALTHCHECK_TIMEOUT_MS = 1500;
const SHARED_GUEST_KEY = 'portfolio-live-presence-guest';

function getSocketUrl(socketUrl: string) {
  return socketUrl.trim() || 'ws://localhost:3006/ws';
}

function getHealthUrl(socketUrl: string): string | null {
  try {
    const url = new URL(getSocketUrl(socketUrl));
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = url.pathname.replace(/\/ws$/, '/health');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function hashString(value: string) {
  return Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function getColorFromSeed(seed: string) {
  const palette = [
    'var(--teal)',
    'var(--amber)',
    'var(--green)',
    'var(--tint-blue-fg)',
    'var(--tint-purple-fg)',
    'var(--tint-emerald-fg)',
  ];
  return palette[hashString(seed) % palette.length] || 'var(--teal)';
}

function buildGuestIdentity() {
  if (typeof window === 'undefined') {
    return { id: 'guest:links', name: 'Guest_links', color: 'var(--teal)' };
  }

  try {
    const raw = window.localStorage.getItem(SHARED_GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; name?: string; color?: string };
      if (parsed.id && parsed.name && parsed.color) {
        return { id: parsed.id, name: parsed.name, color: parsed.color };
      }
    }
  } catch {}

  const alias = `Guest_${Math.random().toString(36).slice(2, 6)}`;
  const identity = {
    id: `guest:${alias.toLowerCase()}`,
    name: alias,
    color: getColorFromSeed(alias),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SHARED_GUEST_KEY, JSON.stringify(identity));
  }

  return identity;
}

export function LivePresencePill({ socketUrl, pagePath, pageLabel }: LivePresencePillProps) {
  const [status, setStatus] = useState<Status>('disconnected');
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [documentMetrics, setDocumentMetrics] = useState({ width: 0, height: 0, scrollX: 0, scrollY: 0 });
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(false);
  const lastMoveAtRef = useRef(0);
  const identity = useMemo(() => buildGuestIdentity(), []);

  useEffect(() => {
    function updateMetrics() {
      setDocumentMetrics({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight),
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });
    }

    updateMetrics();
    window.addEventListener('resize', updateMetrics, { passive: true });
    window.addEventListener('scroll', updateMetrics, { passive: true });
    return () => {
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('scroll', updateMetrics);
    };
  }, []);

  useEffect(() => {
    function sendMove(clientX: number, clientY: number, isTouching: boolean) {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (now - lastMoveAtRef.current < 60) return;
      lastMoveAtRef.current = now;
      const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
      const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      socket.send(JSON.stringify({
        type: 'move',
        payload: {
          x: Math.min(1, Math.max(0, (clientX + window.scrollX) / width)),
          y: Math.min(1, Math.max(0, (clientY + window.scrollY) / height)),
          isTouching,
          sectionId: null,
          sectionLabel: null,
        },
      }));
    }
    const handlePointerMove = (event: PointerEvent) => sendMove(event.clientX, event.clientY, event.pointerType !== 'mouse');
    const handlePointerDown = (event: PointerEvent) => sendMove(event.clientX, event.clientY, event.pointerType !== 'mouse');
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) sendMove(touch.clientX, touch.clientY, true);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    function clearTimers() {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    function scheduleReconnect() {
      clearTimers();
      if (!shouldReconnectRef.current || reconnectTimeoutRef.current) return;
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;
        void connect();
      }, RECONNECT_DELAY_MS);
    }

    async function connect() {
      clearTimers();
      shouldReconnectRef.current = true;
      setStatus('connecting');

      const healthUrl = getHealthUrl(socketUrl);
      if (healthUrl) {
        const { signal, cleanup } = createAbortSignal(HEALTHCHECK_TIMEOUT_MS);

        try {
          const response = await fetch(healthUrl, {
            method: 'GET',
            signal,
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error(`Presence health check failed with status ${response.status}`);
          }
        } catch {
          setStatus('disconnected');
          scheduleReconnect();
          return;
        } finally {
          cleanup();
        }
      }

      const socket = new WebSocket(getSocketUrl(socketUrl));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (socketRef.current !== socket) return;
        setStatus('connected');
        socket.send(
          JSON.stringify({
            type: 'join',
            payload: {
              roomId: 'links-home',
              name: identity.name,
              color: identity.color,
              x: 0.5,
              y: 0.5,
              isTouching: false,
              pagePath,
              pageLabel,
              sectionId: null,
              sectionLabel: null,
            },
          })
        );

        heartbeatRef.current = window.setInterval(() => {
          if (socketRef.current === socket) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_MS);
      });

      socket.addEventListener('message', (event) => {
        if (socketRef.current !== socket) return;

        try {
          const message = JSON.parse(event.data) as PresenceMessage;
          if (message.type === 'welcome') {
            setSelfId(message.payload.selfId);
            return;
          }

          if (message.type === 'overview') {
            setParticipants(
              message.payload.participants
                .slice()
                .sort(
                  (a, b) => a.pageLabel.localeCompare(b.pageLabel) || a.name.localeCompare(b.name)
                )
            );
          }
        } catch {}
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          setStatus('disconnected');
        }

        scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        if (socketRef.current === socket) {
          setStatus('disconnected');
        }
      });
    }

    void connect();

    return () => {
      shouldReconnectRef.current = false;
      clearTimers();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('touchmove', handleTouchMove);
      const activeSocket = socketRef.current;
      if (activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: 'leave' }));
      }
      if (socketRef.current === activeSocket) {
        socketRef.current = null;
      }
      activeSocket?.close();
    };
  }, [identity.color, identity.name, pageLabel, pagePath, socketUrl]);

  return (
    <>
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden="true">
      {participants.map((participant) => {
        const x = participant.x * Math.max(documentMetrics.width, 1) - documentMetrics.scrollX;
        const y = participant.y * Math.max(documentMetrics.height, 1) - documentMetrics.scrollY;
        return (
          <div key={`cursor-${participant.id}`} className="absolute left-0 top-0 transition-transform duration-75 ease-out" style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}>
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <span className="absolute -inset-2 rounded-full blur-md" style={{ background: participant.color, opacity: 0.32 }} />
              <svg className="relative h-6 w-6 drop-shadow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2 L14.3 9.7 L22 12 L14.3 14.3 L12 22 L9.7 14.3 L2 12 L9.7 9.7 Z" fill={participant.color} />
                <circle cx="12" cy="12" r="1.6" fill="white" />
              </svg>
              <span className="ml-4 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] shadow" style={{ borderColor: participant.color }}>
                {participant.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
    <div className="fixed right-16 top-4 z-[52] flex justify-end md:right-[4.5rem] lg:bottom-8 lg:left-6 lg:right-auto lg:top-auto lg:justify-start">
      <div className="pointer-events-auto flex flex-col items-end gap-3 lg:items-start">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex max-w-[calc(100vw-2.5rem)] items-center justify-center gap-2 badge-pill border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] surface-raised-sm motion-base hover:-translate-y-0.5 md:max-w-[260px] md:px-4 md:py-2 md:text-[11px]"
        >
          <span className="inline-flex items-center gap-2 badge-pill bg-[var(--bg-elevated)] px-2 py-1 surface-sunken-sm md:px-2.5">
            <span
              className={`h-2.5 w-2.5 avatar-round ${status === 'connected' ? 'bg-green' : status === 'connecting' ? 'bg-amber' : 'bg-[var(--text-tertiary)]'}`}
            />
            <Activity size={11} className="hidden text-[var(--teal)] md:block" />
            <span className="md:hidden">{participants.length} Online</span>
            <span className="hidden md:inline">{participants.length} Online</span>
          </span>
        </button>

        {isOpen ? (
          <div className="w-[min(calc(100vw-5.5rem),360px)] shape-container border border-[var(--border)] bg-[var(--bg-card)] p-3 surface-raised lg:w-[min(92vw,360px)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Live now
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Shared portfolio presence
                </p>
              </div>
              <span className="badge-pill bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-semibold text-[var(--teal)] surface-sunken-sm">
                {participants.length}
              </span>
            </div>

            <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              {participants.map((participant) => (
                <div
                  key={`${participant.id}-${participant.pageLabel}`}
                  className="flex items-start justify-between gap-3 shape-base border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 surface-raised-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 avatar-round"
                        style={{ background: participant.color }}
                      />
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {participant.name}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {participant.pageLabel}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {participant.sectionLabel || 'Browsing page'}
                    </p>
                  </div>
                  {participant.id === selfId ? (
                    <span className="shrink-0 badge-pill bg-[var(--teal-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
                      Here
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}

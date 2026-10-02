import { useEffect, useRef, useState, useCallback } from 'react';
import { TelemetryData } from '../lib/types';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (data: TelemetryData) => void;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onMessage,
  reconnectInterval = 2000,
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const getWsUrl = useCallback(() => {
    if (url) return url;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // If running in development with proxy
    return `${protocol}//${host}/ws/telemetry`;
  }, [url]);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      try {
        const wsUrl = getWsUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsConnected(true);
          console.log('[WebSocket] Connected to FlowSentinel Telemetry Stream');
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data: TelemetryData = JSON.parse(event.data);
            if (data && data.risk_result) {
              setLatestData(data);
              setHistory((prev) => {
                const next = [...prev, data];
                return next.length > 100 ? next.slice(next.length - 100) : next;
              });
              onMessage?.(data);
            }
          } catch (e) {
            // Ignore non-telemetry packets (like pong)
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsConnected(false);
          reconnectTimeoutRef.current = window.setTimeout(connect, reconnectInterval);
        };

        ws.onerror = () => {
          if (unmounted) return;
          ws.close();
        };
      } catch (err) {
        if (!unmounted) {
          reconnectTimeoutRef.current = window.setTimeout(connect, reconnectInterval);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [getWsUrl, onMessage, reconnectInterval]);

  const sendCommand = useCallback((command: string, payload: any = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, ...payload }));
    }
  }, []);

  return {
    isConnected,
    latestData,
    history,
    sendCommand,
  };
}

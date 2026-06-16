'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, WifiOff } from 'lucide-react';

const DEFAULT_RPC_ENDPOINT = 'https://soroban-testnet.stellar.org';
const RPC_HEALTH_REQUEST_BODY = '{"jsonrpc":"2.0","id":1,"method":"getHealth"}';

export const HEARTBEAT_INTERVAL_MS = 10_000;
export const DEGRADED_LATENCY_MS = 1_000;
export const RPC_REQUEST_TIMEOUT_MS = 8_000;

export type NetworkHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface RpcHealthSnapshot {
  status: NetworkHealthStatus;
  latencyMs: number | null;
  message: string;
}

interface RpcHealthResponse {
  result?: {
    status?: string;
  };
  error?: unknown;
}

function describeRpcError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'RPC getHealth returned an error';
}

interface NetworkStatusProps {
  endpoint?: string;
  fetcher?: typeof fetch;
  now?: () => number;
}

const INITIAL_SNAPSHOT: RpcHealthSnapshot = {
  status: 'degraded',
  latencyMs: null,
  message: 'Checking RPC health...',
};

const STATUS_STYLES = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle2,
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  degraded: {
    label: 'Degraded',
    icon: Clock3,
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const;


export async function fetchRpcHealth(
  endpoint: string,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<RpcHealthSnapshot> {
  const startedAt = now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, RPC_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: RPC_HEALTH_REQUEST_BODY,
      cache: 'no-store',
      signal: abortController.signal,
    });
    const latencyMs = Math.max(0, Math.round(now() - startedAt));

    if (!response.ok) {
      return {
        status: 'offline',
        latencyMs,
        message: `RPC returned HTTP ${response.status}. Network requests may fail; try again or switch RPC endpoints.`,
      };
    }

    let payload: RpcHealthResponse;
    try {
      payload = (await response.json()) as RpcHealthResponse;
    } catch (error) {
      if (abortController.signal.aborted) {
        console.error('Stellar RPC getHealth request failed', { endpoint, error });
        return {
          status: 'offline',
          latencyMs: null,
          message: `RPC unreachable at ${endpoint}. Check your network connection or switch RPC endpoints.`,
        };
      }

      console.error('Stellar RPC getHealth returned invalid JSON', { endpoint, error });
      return {
        status: 'degraded',
        latencyMs,
        message: 'RPC returned an invalid health response. Switch RPC endpoints if this continues.',
      };
    }

    const reportedStatus = payload.result?.status;

    if (payload.error) {
      return {
        status: 'degraded',
        latencyMs,
        message: `RPC getHealth error: ${describeRpcError(payload.error)}`,
      };
    }

    if (reportedStatus !== 'healthy') {
      return {
        status: 'degraded',
        latencyMs,
        message: reportedStatus ? `RPC reported ${reportedStatus}` : 'RPC health status unavailable. Switch RPC endpoints if this continues.',
      };
    }

    if (latencyMs >= DEGRADED_LATENCY_MS) {
      return {
        status: 'degraded',
        latencyMs,
        message: 'RPC responded slowly. Network requests may take longer than expected.',
      };
    }

    return {
      status: 'healthy',
      latencyMs,
      message: 'RPC getHealth is responding normally',
    };
  } catch (error) {
    console.error('Stellar RPC getHealth request failed', { endpoint, error });
    return {
      status: 'offline',
      latencyMs: null,
      message: `RPC unreachable at ${endpoint}. Check your network connection or switch RPC endpoints.`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function NetworkStatus({ endpoint, fetcher = fetch, now = Date.now }: NetworkStatusProps) {
  const rpcEndpoint = endpoint ?? process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? DEFAULT_RPC_ENDPOINT;
  const [snapshot, setSnapshot] = useState<RpcHealthSnapshot>(INITIAL_SNAPSHOT);
  const latestCheckId = useRef(0);
  const statusStyle = STATUS_STYLES[snapshot.status];
  const StatusIcon = statusStyle.icon;

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      const checkId = latestCheckId.current + 1;
      latestCheckId.current = checkId;
      const nextSnapshot = await fetchRpcHealth(rpcEndpoint, fetcher, now);
      if (!isMounted || checkId !== latestCheckId.current) {
        return;
      }
      setSnapshot((currentSnapshot) => {
        const sameStatusAndMessage =
          currentSnapshot.status === nextSnapshot.status &&
          currentSnapshot.message === nextSnapshot.message;
        const sameVisibleState =
          sameStatusAndMessage &&
          (nextSnapshot.status === 'offline' || currentSnapshot.latencyMs === nextSnapshot.latencyMs);

        return sameVisibleState ? currentSnapshot : nextSnapshot;
      });
    }

    void checkHealth();
    const intervalId = window.setInterval(() => {
      void checkHealth();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [fetcher, now, rpcEndpoint]);

  return (
    <section
      aria-label="Stellar RPC network status"
      aria-live="polite"
      role={snapshot.status === 'offline' ? 'alert' : 'status'}
      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:max-w-2xl"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Stellar RPC status</h2>
          </div>
          <p className="font-mono text-xs text-slate-600 break-all dark:text-slate-400">{rpcEndpoint}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{snapshot.message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium ${statusStyle.badge}`}>
            <span data-testid="rpc-status-dot" className={`h-2 w-2 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
            <StatusIcon className="h-4 w-4" aria-hidden="true" />
            {statusStyle.label}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {snapshot.latencyMs === null ? 'Latency —' : `${snapshot.latencyMs} ms`}
          </span>
        </div>
      </div>
    </section>
  );
}

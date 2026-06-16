"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface OhlcvBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  address: string;
  initialData?: OhlcvBar[];
  timeframe?: "hour" | "day";
  onTimeframeChange?: (tf: "hour" | "day") => void;
}

declare global {
  interface Window {
    LightweightCharts?: any;
  }
}

let _chartLib: any = null;
let _loadingPromise: Promise<any> | null = null;

async function loadChartLib(): Promise<any> {
  if (_chartLib) return _chartLib;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is undefined"));
      return;
    }
    if (window.LightweightCharts) {
      _chartLib = window.LightweightCharts;
      resolve(_chartLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js";
    script.async = true;
    script.onload = () => {
      _chartLib = window.LightweightCharts;
      resolve(_chartLib);
    };
    script.onerror = () => reject(new Error("Failed to load lightweight-charts"));
    document.head.appendChild(script);
  });
  return _loadingPromise;
}

export function PriceChart({ address, initialData, timeframe: initialTf = "hour", onTimeframeChange }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"hour" | "day">(initialTf);

  useEffect(() => {
    if (!initialData) return;
    setLoading(false);
  }, [initialData]);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;
    (async () => {
      try {
        const lib = await loadChartLib();
        if (cancelled || !containerRef.current) return;

        // Clean up previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = lib.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: "solid", color: "#0a0a0f" },
            textColor: "#94a3b8",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 12,
          },
          grid: {
            vertLines: { color: "#1e1e2e" },
            horzLines: { color: "#1e1e2e" },
          },
          crosshair: { mode: 1 },
          rightPriceScale: { borderColor: "#1e1e2e" },
          timeScale: { borderColor: "#1e1e2e", timeVisible: true, secondsVisible: false },
        });
        chartRef.current = chart;

        const candleSeries = chart.addCandlestickSeries({
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderUpColor: "#22c55e",
          borderDownColor: "#ef4444",
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        seriesRef.current = candleSeries;

        const volSeries = chart.addHistogramSeries({
          color: "#22c55e",
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
        });
        volSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        volSeriesRef.current = volSeries;

        // Load data
        const data = initialData || (await fetchChartData(address, timeframe));
        if (cancelled) return;
        if (!data || data.length === 0) {
          setError("No chart data available");
          setLoading(false);
          return;
        }
        candleSeries.setData(data);
        volSeries.setData(data.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
        })));
        chart.timeScale().fitContent();
        setLoading(false);

        // Auto-resize
        resizeObserver = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        resizeObserver.observe(containerRef.current);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load chart");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, timeframe, initialData]);

  const switchTimeframe = async (tf: "hour" | "day") => {
    if (tf === timeframe) return;
    setTimeframe(tf);
    onTimeframeChange?.(tf);
    setLoading(true);
    try {
      const data = await fetchChartData(address, tf);
      if (seriesRef.current && data && data.length > 0) {
        seriesRef.current.setData(data);
        if (volSeriesRef.current) {
          volSeriesRef.current.setData(data.map((b) => ({
            time: b.time,
            value: b.volume,
            color: b.close >= b.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
          })));
        }
        chartRef.current?.timeScale().fitContent();
      }
    } catch (e) {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card !p-0">
      <div className="flex items-center justify-between border-b border-border-subtle p-4">
        <h3 className="text-sm font-semibold">Price Chart</h3>
        <div className="flex gap-1">
          {(["hour", "day"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => switchTimeframe(tf)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeframe === tf ? "bg-brand/20 text-brand" : "text-text-muted hover:bg-bg-elevated"
              }`}
            >
              {tf === "hour" ? "1H" : "1D"}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[400px] w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
            {error}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

async function fetchChartData(address: string, timeframe: "hour" | "day"): Promise<OhlcvBar[]> {
  const res = await fetch(`/api/token/${address}/chart?timeframe=${timeframe}`, { cache: "no-store" });
  if (!res.ok) return [];
  const j = await res.json();
  return j.bars || [];
}

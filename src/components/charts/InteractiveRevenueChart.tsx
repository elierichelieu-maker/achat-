import React, { useState, useMemo } from 'react';
import { Sale } from '../../types';
import { formatHTG } from '../../utils/formatters';

interface InteractiveRevenueChartProps {
  sales: Sale[];
  days?: number;
}

export const InteractiveRevenueChart: React.FC<InteractiveRevenueChartProps> = ({
  sales,
  days = 30,
}) => {
  const [activeMetric, setActiveMetric] = useState<'combined' | 'revenue' | 'profit' | 'margin'>('combined');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    count: number;
  } | null>(null);

  // Group sales by day
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; cost: number; profit: number; count: number }>();
    const now = new Date('2026-10-22T23:59:59Z');

    // Pre-populate days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map.set(key, { date: key, revenue: 0, cost: 0, profit: 0, count: 0 });
    }

    sales.forEach((s) => {
      const key = s.date.split('T')[0];
      if (map.has(key)) {
        const item = map.get(key)!;
        item.revenue += s.totalHT;
        item.cost += s.totalCost;
        item.profit += s.netProfit;
        item.count += 1;
      }
    });

    return Array.from(map.values()).map((d) => ({
      ...d,
      margin: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0,
      label: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    }));
  }, [sales, days]);

  const maxRevenue = useMemo(() => {
    const max = Math.max(...dailyData.map((d) => d.revenue), 1000);
    return Math.ceil(max / 1000) * 1000;
  }, [dailyData]);

  const maxMargin = 100;

  // Chart dimensions
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (dailyData.length <= 1) return [];
    return dailyData.map((d, index) => {
      const x = padding.left + (index / (dailyData.length - 1)) * innerWidth;
      const yRev = padding.top + innerHeight - (d.revenue / maxRevenue) * innerHeight;
      const yProfit = padding.top + innerHeight - (d.profit / maxRevenue) * innerHeight;
      const yMargin = padding.top + innerHeight - (d.margin / maxMargin) * innerHeight;
      return {
        x,
        yRev,
        yProfit,
        yMargin,
        data: d,
      };
    });
  }, [dailyData, innerWidth, innerHeight, maxRevenue, padding.left, padding.top]);

  // Construct SVG paths
  const revenuePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.yRev}`, '');
  }, [points]);

  const revenueArea = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baselineY = padding.top + innerHeight;
    return `${revenuePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [revenuePath, points, innerHeight, padding.top]);

  const profitPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.yProfit}`, '');
  }, [points]);

  const profitArea = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baselineY = padding.top + innerHeight;
    return `${profitPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [profitPath, points, innerHeight, padding.top]);

  const marginPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.yMargin}`, '');
  }, [points]);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: Math.round(maxRevenue * pct),
    y: padding.top + innerHeight - pct * innerHeight,
    pctMargin: Math.round(maxMargin * pct),
  }));

  // X-axis label step to avoid clutter
  const step = Math.max(1, Math.floor(dailyData.length / 6));

  const totalPeriodRevenue = useMemo(() => dailyData.reduce((acc, d) => acc + d.revenue, 0), [dailyData]);
  const totalPeriodProfit = useMemo(() => dailyData.reduce((acc, d) => acc + d.profit, 0), [dailyData]);
  const avgMargin = totalPeriodRevenue > 0 ? Math.round((totalPeriodProfit / totalPeriodRevenue) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Trajectoire des Ventes & Rentabilité
            </h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {days} derniers jours
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
            <span>
              Total CA : <strong className="text-slate-900 font-semibold tabular-nums">{formatHTG(totalPeriodRevenue)}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <span>
              Bénéfice Net : <strong className="text-emerald-700 font-semibold tabular-nums">+{formatHTG(totalPeriodProfit)}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <span>
              Marge Réalisée : <strong className="text-indigo-700 font-semibold tabular-nums">{avgMargin}%</strong>
            </span>
          </div>
        </div>

        {/* View metric toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMetric('combined')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeMetric === 'combined'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue Combinée
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeMetric === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CA Uniquement
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('profit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeMetric === 'profit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bénéfice Net
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('margin')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeMetric === 'margin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Marge (%)
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative mt-4 w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={width - padding.right}
                y2={t.y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={t.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono tabular-nums"
              >
                {activeMetric === 'margin' ? `${t.pctMargin}%` : `${(t.val / 1000).toFixed(1)}k€`}
              </text>
            </g>
          ))}

          {/* Revenue Area & Line */}
          {(activeMetric === 'combined' || activeMetric === 'revenue') && (
            <>
              <path d={revenueArea} fill="url(#revenueGrad)" />
              <path
                d={revenuePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Profit Area & Line */}
          {(activeMetric === 'combined' || activeMetric === 'profit') && (
            <>
              <path d={profitArea} fill="url(#profitGrad)" />
              <path
                d={profitPath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Margin Line */}
          {activeMetric === 'margin' && (
            <path
              d={marginPath}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-axis labels */}
          {points.map((p, i) => {
            if (i % step !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                className="text-[11px] fill-slate-500 font-sans font-medium"
              >
                {p.data.label}
              </text>
            );
          })}

          {/* Invisible hover trigger columns */}
          {points.map((p, i) => {
            const nextX = points[i + 1]?.x ?? width - padding.right;
            const prevX = points[i - 1]?.x ?? padding.left;
            const colWidth = (nextX - prevX) / 2;
            const isHovered = hoveredPoint?.date === p.data.date;

            return (
              <g key={i}>
                <rect
                  x={p.x - colWidth / 2}
                  y={padding.top}
                  width={colWidth}
                  height={innerHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      x: p.x,
                      y: activeMetric === 'profit' ? p.yProfit : p.yRev,
                      date: p.data.date,
                      revenue: p.data.revenue,
                      cost: p.data.cost,
                      profit: p.data.profit,
                      margin: p.data.margin,
                      count: p.data.count,
                    })
                  }
                />
                {isHovered && (
                  <>
                    <line
                      x1={p.x}
                      y1={padding.top}
                      x2={p.x}
                      y2={padding.top + innerHeight}
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    {(activeMetric === 'combined' || activeMetric === 'revenue') && (
                      <circle cx={p.x} cy={p.yRev} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    )}
                    {(activeMetric === 'combined' || activeMetric === 'profit') && (
                      <circle cx={p.x} cy={p.yProfit} r="5" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                    )}
                    {activeMetric === 'margin' && (
                      <circle cx={p.x} cy={p.yMargin} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-20 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-lg border border-slate-800 transition-all duration-75"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: '16px',
              transform: hoveredPoint.x > width * 0.65 ? 'translateX(-105%)' : 'translateX(10%)',
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
              <span>{new Date(hoveredPoint.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
              <span className="text-[11px] text-slate-400 tabular-nums">{hoveredPoint.count} vente{hoveredPoint.count > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1 tabular-nums font-mono">
              <div className="flex items-center justify-between gap-3 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Chiffre d'Affaires HT :
                </span>
                <span className="font-medium text-white">{formatHTG(hoveredPoint.revenue)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  Coût d'Achat :
                </span>
                <span>{formatHTG(hoveredPoint.cost)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-emerald-400 pt-1 border-t border-slate-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Bénéfice Net :
                </span>
                <span>+{formatHTG(hoveredPoint.profit)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-indigo-300 text-[11px]">
                <span>Taux de Marge Brute :</span>
                <span className="font-semibold">{hoveredPoint.margin}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
        {(activeMetric === 'combined' || activeMetric === 'revenue') && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-blue-600 rounded-sm inline-block" />
            <span>Chiffre d'affaires HT</span>
          </div>
        )}
        {(activeMetric === 'combined' || activeMetric === 'profit') && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-600 rounded-sm inline-block" />
            <span>Bénéfice Net Réalisé</span>
          </div>
        )}
        {activeMetric === 'margin' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-600 rounded-sm inline-block" />
            <span>Taux de Marge (%)</span>
          </div>
        )}
      </div>
    </div>
  );
};

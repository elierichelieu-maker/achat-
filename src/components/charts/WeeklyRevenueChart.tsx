import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Sale } from '../../types';
import { formatHTG } from '../../utils/formatters';
import {
  TrendingUp,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingBag,
  Percent,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface WeeklyRevenueChartProps {
  sales: Sale[];
  className?: string;
}

interface WeeklyDataPoint {
  id: string;
  weekName: string; // e.g. "Semaine S-3", "Semaine Actuelle"
  shortName: string; // e.g. "S-3", "S-2", "S-1", "Actuelle"
  dateRangeLabel: string; // e.g. "25 sept. - 01 oct."
  startDate: Date;
  endDate: Date;
  revenueHT: number;
  revenueTTC: number;
  netProfit: number;
  ordersCount: number;
  itemsSold: number;
  growthVsPrevious: number | null; // % growth compared to previous week
  marginRate: number; // % margin
}

export const WeeklyRevenueChart: React.FC<WeeklyRevenueChartProps> = ({
  sales,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'revenue' | 'profit'>('both');

  // Compute the 4 weeks data ending on latest sale date or today
  const weeklyData = useMemo(() => {
    // 1. Reference date
    let referenceTime = Date.now();
    if (sales.length > 0) {
      const maxSaleTime = Math.max(...sales.map((s) => new Date(s.date).getTime()));
      if (!isNaN(maxSaleTime) && maxSaleTime > 0) {
        referenceTime = maxSaleTime;
      }
    }

    const refDate = new Date(referenceTime);
    refDate.setHours(23, 59, 59, 999);

    // 2. Define 4 weekly periods (7 days each)
    const weeks: WeeklyDataPoint[] = [];

    const weekLabels = [
      { id: 'w-3', name: 'Semaine S-3', short: 'S-3' },
      { id: 'w-2', name: 'Semaine S-2', short: 'S-2' },
      { id: 'w-1', name: 'Semaine S-1', short: 'S-1' },
      { id: 'w-0', name: 'Semaine Actuelle', short: 'Actuelle' },
    ];

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(refDate);
      weekEnd.setDate(refDate.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const sLabel = weekStart.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });
      const eLabel = weekEnd.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });

      const labelIdx = 3 - i;
      weeks.push({
        id: weekLabels[labelIdx].id,
        weekName: weekLabels[labelIdx].name,
        shortName: weekLabels[labelIdx].short,
        dateRangeLabel: `${sLabel} - ${eLabel}`,
        startDate: weekStart,
        endDate: weekEnd,
        revenueHT: 0,
        revenueTTC: 0,
        netProfit: 0,
        ordersCount: 0,
        itemsSold: 0,
        growthVsPrevious: null,
        marginRate: 0,
      });
    }

    // 3. Aggregate sales into each week
    sales.forEach((s) => {
      const sTime = new Date(s.date).getTime();
      for (const w of weeks) {
        if (sTime >= w.startDate.getTime() && sTime <= w.endDate.getTime()) {
          w.revenueHT += s.totalHT || 0;
          w.revenueTTC += s.totalTTC || 0;
          w.netProfit += s.netProfit || 0;
          w.ordersCount += 1;
          if (s.items && Array.isArray(s.items)) {
            w.itemsSold += s.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          }
          break;
        }
      }
    });

    // 4. Calculate margin rate and weekly growth
    weeks.forEach((w, idx) => {
      w.marginRate = w.revenueHT > 0 ? Math.round((w.netProfit / w.revenueHT) * 100) : 0;
      if (idx > 0) {
        const prevRev = weeks[idx - 1].revenueHT;
        if (prevRev > 0) {
          w.growthVsPrevious = Math.round(((w.revenueHT - prevRev) / prevRev) * 1000) / 10;
        } else if (w.revenueHT > 0) {
          w.growthVsPrevious = 100;
        } else {
          w.growthVsPrevious = 0;
        }
      }
    });

    return weeks;
  }, [sales]);

  // Overall statistics for the 4 weeks
  const stats = useMemo(() => {
    const totalHT = weeklyData.reduce((sum, w) => sum + w.revenueHT, 0);
    const totalTTC = weeklyData.reduce((sum, w) => sum + w.revenueTTC, 0);
    const totalProfit = weeklyData.reduce((sum, w) => sum + w.netProfit, 0);
    const totalOrders = weeklyData.reduce((sum, w) => sum + w.ordersCount, 0);
    const avgWeeklyHT = totalHT / 4;
    const currentWeek = weeklyData[3];
    const prevWeek = weeklyData[2];
    const latestGrowth = currentWeek?.growthVsPrevious ?? null;
    const avgMargin = totalHT > 0 ? Math.round((totalProfit / totalHT) * 100) : 0;

    return {
      totalHT,
      totalTTC,
      totalProfit,
      totalOrders,
      avgWeeklyHT,
      currentWeekHT: currentWeek?.revenueHT || 0,
      prevWeekHT: prevWeek?.revenueHT || 0,
      latestGrowth,
      avgMargin,
    };
  }, [weeklyData]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeeklyDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-white text-xs space-y-2 min-w-[230px]">
          <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-amber-400 block">{data.weekName}</span>
              <span className="text-[10px] text-slate-400">{data.dateRangeLabel}</span>
            </div>
            {data.growthVsPrevious !== null && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  data.growthVsPrevious >= 0
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {data.growthVsPrevious >= 0 ? '+' : ''}
                {data.growthVsPrevious}% vs S-1
              </span>
            )}
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                Chiffre d'Affaires HT :
              </span>
              <span className="font-bold text-white">{formatHTG(data.revenueHT)}</span>
            </div>

            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block"></span>
                Total TTC :
              </span>
              <span className="font-semibold text-slate-200">{formatHTG(data.revenueTTC)}</span>
            </div>

            <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800">
              <span className="text-emerald-400 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Bénéfice Net :
              </span>
              <span className="font-bold text-emerald-400">
                {formatHTG(data.netProfit)} ({data.marginRate}%)
              </span>
            </div>

            <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800">
              <span className="text-blue-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
                Commandes conclues :
              </span>
              <span className="font-bold text-blue-300">{data.ordersCount} ventes</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <CalendarRange className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Évolution Hebdomadaire du Chiffre d'Affaires (4 Dernières Semaines)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Vue Mensuelle Consolidée
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perspective macroscopique par bloc de 7 jours pour mesurer la trajectoire de croissance et la marge globale
            </p>
          </div>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'both'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CA + Marge
          </button>
          <button
            type="button"
            onClick={() => setViewMode('revenue')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CA Uniquement
          </button>
          <button
            type="button"
            onClick={() => setViewMode('profit')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'profit'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bénéfice Net
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Total 4 Semaines */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <span className="text-[11px] text-amber-800 font-medium block">Total CA 4 Semaines</span>
          <span className="text-base sm:text-lg font-bold text-amber-950 font-mono tabular-nums block mt-0.5">
            {formatHTG(stats.totalHT)}
          </span>
          <span className="text-[10px] text-amber-700/80">TTC : {formatHTG(stats.totalTTC)}</span>
        </div>

        {/* Card 2: Semaine Actuelle vs Précédente */}
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-medium">Semaine en Cours</span>
            {stats.latestGrowth !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  stats.latestGrowth >= 0
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-rose-700 bg-rose-100'
                }`}
              >
                {stats.latestGrowth >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {stats.latestGrowth >= 0 ? '+' : ''}
                {stats.latestGrowth}%
              </span>
            )}
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums block mt-0.5">
            {formatHTG(stats.currentWeekHT)}
          </span>
          <span className="text-[10px] text-slate-500">
            vs S-1 : {formatHTG(stats.prevWeekHT)}
          </span>
        </div>

        {/* Card 3: Bénéfice Net Total */}
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
          <span className="text-[11px] text-emerald-800 font-medium block">Marge Nette 4 Semaines</span>
          <span className="text-base sm:text-lg font-bold text-emerald-950 font-mono tabular-nums block mt-0.5">
            +{formatHTG(stats.totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-700/80">Taux de marge : {stats.avgMargin}%</span>
        </div>

        {/* Card 4: Moyenne Hebdomadaire */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-600 font-medium block">Moyenne Hebdomadaire</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums block mt-0.5">
            {formatHTG(stats.avgWeeklyHT)}
          </span>
          <span className="text-[10px] text-slate-500">{stats.totalOrders} commandes sur 4 sem.</span>
        </div>
      </div>

      {/* Main Weekly Line Chart */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={weeklyData}
            margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorWeeklyArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="weekName"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(val) => {
                if (val >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* Reference Line for 4-week Average Revenue */}
            <ReferenceLine
              y={stats.avgWeeklyHT}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: `Moyenne (${formatHTG(stats.avgWeeklyHT)})`,
                position: 'insideTopLeft',
                fill: '#64748b',
                fontSize: 10,
              }}
            />

            {/* Area shadow under revenue line */}
            {(viewMode === 'both' || viewMode === 'revenue') && (
              <Area
                type="monotone"
                dataKey="revenueHT"
                legendType="none"
                fill="url(#colorWeeklyArea)"
                stroke="none"
              />
            )}

            {/* Main Linear Curve: Chiffre d'Affaires Hebdomadaire HT */}
            {(viewMode === 'both' || viewMode === 'revenue') && (
              <Line
                type="monotone"
                dataKey="revenueHT"
                name="Chiffre d'Affaires Hebdo (HT)"
                stroke="#d97706"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: '#d97706',
                  strokeWidth: 2,
                  stroke: '#ffffff',
                }}
                activeDot={{
                  r: 7,
                  fill: '#b45309',
                  stroke: '#ffffff',
                  strokeWidth: 2.5,
                }}
              />
            )}

            {/* Linear Curve: Bénéfice Net Hebdomadaire */}
            {(viewMode === 'both' || viewMode === 'profit') && (
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Bénéfice Net Hebdo"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: '#10b981',
                  strokeWidth: 2,
                  stroke: '#ffffff',
                }}
                activeDot={{
                  r: 6,
                  fill: '#059669',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Week-by-Week Milestone Breakdown Cards */}
      <div className="pt-2 border-t border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {weeklyData.map((w, idx) => (
            <div
              key={w.id}
              className={`p-2.5 rounded-lg border transition-all ${
                idx === 3
                  ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{w.weekName}</span>
                {w.growthVsPrevious !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      w.growthVsPrevious >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {w.growthVsPrevious >= 0 ? '+' : ''}
                    {w.growthVsPrevious}%
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">{w.dateRangeLabel}</span>

              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {formatHTG(w.revenueHT)}
                </span>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                  +{formatHTG(w.netProfit)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {w.ordersCount} ventes · {w.itemsSold} art.
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

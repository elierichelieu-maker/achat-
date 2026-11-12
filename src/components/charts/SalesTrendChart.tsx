import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Sale } from '../../types';
import { formatHTG } from '../../utils/formatters';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Calendar,
  BarChart3,
  Layers,
  RotateCcw,
  Filter,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface SalesTrendChartProps {
  sales: Sale[];
  className?: string;
}

interface DailyTrendPoint {
  dateKey: string;
  dayLabel: string;
  fullDate: string;
  revenueHT: number;
  revenueTTC: number;
  netProfit: number;
  ordersCount: number;
  itemsSold: number;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  sales,
  className = '',
}) => {
  const [activeMetric, setActiveMetric] = useState<'combined' | 'revenue' | 'orders'>('combined');
  const [activePreset, setActivePreset] = useState<'7d' | '14d' | '30d' | 'month' | 'custom'>('7d');

  // Determine the default reference date from latest sale or current date
  const defaultRefDateStr = useMemo(() => {
    let referenceTime = Date.now();
    if (sales.length > 0) {
      const maxSaleTime = Math.max(...sales.map((s) => new Date(s.date).getTime()));
      if (!isNaN(maxSaleTime) && maxSaleTime > 0) {
        referenceTime = maxSaleTime;
      }
    }
    const d = new Date(referenceTime);
    return d.toISOString().split('T')[0];
  }, [sales]);

  // Compute default start date (7 days ending on reference date)
  const defaultStartDateStr = useMemo(() => {
    const end = new Date(defaultRefDateStr + 'T00:00:00');
    end.setDate(end.getDate() - 6);
    return end.toISOString().split('T')[0];
  }, [defaultRefDateStr]);

  // Date filters state: start and end dates
  const [startDate, setStartDate] = useState<string>(defaultStartDateStr);
  const [endDate, setEndDate] = useState<string>(defaultRefDateStr);

  // Set quick preset dates
  const applyPreset = (preset: '7d' | '14d' | '30d' | 'month') => {
    setActivePreset(preset);
    const end = new Date(defaultRefDateStr + 'T00:00:00');
    let start = new Date(defaultRefDateStr + 'T00:00:00');

    if (preset === '7d') {
      start.setDate(end.getDate() - 6);
    } else if (preset === '14d') {
      start.setDate(end.getDate() - 13);
    } else if (preset === '30d') {
      start.setDate(end.getDate() - 29);
    } else if (preset === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Reset to default 7 days
  const handleResetFilters = () => {
    applyPreset('7d');
  };

  // Compute daily trends dynamically based on customized startDate and endDate
  const { trendData, daysCount, isCustomPeriod } = useMemo(() => {
    const sDate = startDate || defaultStartDateStr;
    const eDate = endDate || defaultRefDateStr;

    const start = new Date(sDate + 'T00:00:00');
    const end = new Date(eDate + 'T23:59:59');

    // Handle inversion if user selected start > end
    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;

    const diffTime = Math.abs(actualEnd.getTime() - actualStart.getTime());
    // Safe bound between 1 and 90 days to maintain high performance
    const count = Math.min(90, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));

    const daysMap = new Map<string, DailyTrendPoint>();
    const cur = new Date(actualStart);
    cur.setHours(0, 0, 0, 0);

    const isLargeRange = count > 14;

    for (let i = 0; i < count; i++) {
      const d = new Date(cur);
      d.setDate(cur.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];

      const dayLabel = isLargeRange
        ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) // e.g. "06/10"
        : d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }); // e.g. "lun. 06"

      const fullDate = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      daysMap.set(dateKey, {
        dateKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        fullDate,
        revenueHT: 0,
        revenueTTC: 0,
        netProfit: 0,
        ordersCount: 0,
        itemsSold: 0,
      });
    }

    // Aggregate sales within the custom date range
    sales.forEach((s) => {
      const key = s.date.split('T')[0];
      if (daysMap.has(key)) {
        const point = daysMap.get(key)!;
        point.revenueHT += s.totalHT || 0;
        point.revenueTTC += s.totalTTC || 0;
        point.netProfit += s.netProfit || 0;
        point.ordersCount += 1;
        if (s.items && Array.isArray(s.items)) {
          point.itemsSold += s.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
        }
      }
    });

    return {
      trendData: Array.from(daysMap.values()),
      daysCount: count,
      isCustomPeriod: activePreset === 'custom' || count !== 7,
    };
  }, [sales, startDate, endDate, defaultStartDateStr, defaultRefDateStr, activePreset]);

  // Aggregate stats over the customized period
  const stats = useMemo(() => {
    const totalRevHT = trendData.reduce((sum, d) => sum + d.revenueHT, 0);
    const totalRevTTC = trendData.reduce((sum, d) => sum + d.revenueTTC, 0);
    const totalOrders = trendData.reduce((sum, d) => sum + d.ordersCount, 0);
    const totalProfit = trendData.reduce((sum, d) => sum + d.netProfit, 0);
    const divisor = Math.max(1, daysCount);
    const avgDailyRev = totalRevHT / divisor;
    const avgBasket = totalOrders > 0 ? totalRevHT / totalOrders : 0;
    const marginRate = totalRevHT > 0 ? Math.round((totalProfit / totalRevHT) * 100) : 0;

    return {
      totalRevHT,
      totalRevTTC,
      totalOrders,
      totalProfit,
      avgDailyRev,
      avgBasket,
      marginRate,
    };
  }, [trendData, daysCount]);

  // Format readable range label
  const formattedRangeLabel = useMemo(() => {
    if (!startDate || !endDate) return '';
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    const sFmt = s.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const eFmt = e.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `Du ${sFmt} au ${eFmt}`;
  }, [startDate, endDate]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: DailyTrendPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-white text-xs space-y-2 min-w-[210px]">
          <div className="border-b border-slate-700/80 pb-1.5">
            <span className="font-bold text-amber-400 capitalize block">{dataPoint.fullDate}</span>
            <span className="text-[10px] text-slate-400">
              {dataPoint.ordersCount} commande{dataPoint.ordersCount > 1 ? 's' : ''} réalisée{dataPoint.ordersCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                Chiffre d'Affaires HT :
              </span>
              <span className="font-bold text-white">{formatHTG(dataPoint.revenueHT)}</span>
            </div>

            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block"></span>
                Total TTC :
              </span>
              <span className="font-semibold text-slate-200">{formatHTG(dataPoint.revenueTTC)}</span>
            </div>

            <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800">
              <span className="text-emerald-400 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                Bénéfice Net :
              </span>
              <span className="font-bold text-emerald-400">{formatHTG(dataPoint.netProfit)}</span>
            </div>

            <div className="flex justify-between items-center gap-3 pt-1 border-t border-slate-800">
              <span className="text-blue-300 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
                Commandes / jour :
              </span>
              <span className="font-bold text-blue-300">{dataPoint.ordersCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 ${className}`}>
      {/* Chart Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <TrendingUp className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Tendance des Ventes ({daysCount} Jours)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {formattedRangeLabel}
              </span>
              {isCustomPeriod && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Période Personnalisée
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Évolution quotidienne du chiffre d'affaires, de la marge nette et du nombre de commandes
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveMetric('combined')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              activeMetric === 'combined'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Vue Combinée</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              activeMetric === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revenus & Marge</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('orders')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              activeMetric === 'orders'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Commandes</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar (Start Date & End Date Filters) */}
      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Date Inputs: Début et Fin */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Filtrer par date :</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-medium uppercase">Du</span>
              <input
                type="date"
                value={startDate}
                max={endDate || defaultRefDateStr}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="text-xs font-mono font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Date de début"
              />
            </div>

            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline" />

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-medium uppercase">Au</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="text-xs font-mono font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Date de fin"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets & Reset Button */}
        <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
          <span className="text-[11px] text-slate-500 hidden md:inline">Périodes :</span>

          <button
            type="button"
            onClick={() => applyPreset('7d')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activePreset === '7d'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            7 Jours
          </button>

          <button
            type="button"
            onClick={() => applyPreset('14d')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activePreset === '14d'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            14 Jours
          </button>

          <button
            type="button"
            onClick={() => applyPreset('30d')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activePreset === '30d'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            30 Jours
          </button>

          <button
            type="button"
            onClick={() => applyPreset('month')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activePreset === 'month'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Ce Mois
          </button>

          {isCustomPeriod && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Réinitialiser sur 7 jours par défaut"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic KPI Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <span className="text-[11px] text-amber-800 font-medium block">
            Total CA ({daysCount}J)
          </span>
          <span className="text-base sm:text-lg font-bold text-amber-950 font-mono tabular-nums block mt-0.5">
            {formatHTG(stats.totalRevHT)}
          </span>
          <span className="text-[10px] text-amber-700/80">TTC : {formatHTG(stats.totalRevTTC)}</span>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
          <span className="text-[11px] text-emerald-800 font-medium block">
            Bénéfice Net ({daysCount}J)
          </span>
          <span className="text-base sm:text-lg font-bold text-emerald-950 font-mono tabular-nums block mt-0.5">
            +{formatHTG(stats.totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-700/80">Marge : {stats.marginRate}%</span>
        </div>

        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
          <span className="text-[11px] text-blue-800 font-medium block">Commandes Émises</span>
          <span className="text-base sm:text-lg font-bold text-blue-950 font-mono tabular-nums block mt-0.5">
            {stats.totalOrders} ventes
          </span>
          <span className="text-[10px] text-blue-700/80">
            Moy. {(stats.totalOrders / daysCount).toFixed(1)} / jour
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-600 font-medium block">Panier Moyen / Facture</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums block mt-0.5">
            {formatHTG(stats.avgBasket)}
          </span>
          <span className="text-[10px] text-slate-500">
            Moy. {formatHTG(stats.avgDailyRev)} / jour
          </span>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={trendData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              {/* Gradient for Revenue Area */}
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradient for Profit Area */}
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradient for Orders Bar */}
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: daysCount > 20 ? 9 : 11 }}
              interval={daysCount > 25 ? 'preserveStartEnd' : 0}
            />

            {/* Left Y Axis for Monetary Values */}
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(val) => {
                if (val >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
            />

            {/* Right Y Axis for Order Counts (only in combined/orders mode) */}
            {(activeMetric === 'combined' || activeMetric === 'orders') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#3b82f6', fontSize: 10, fontFamily: 'monospace' }}
                allowDecimals={false}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {/* Orders Bar (Combined or Orders view) */}
            {(activeMetric === 'combined' || activeMetric === 'orders') && (
              <Bar
                yAxisId="right"
                dataKey="ordersCount"
                name="Nb Commandes"
                fill="url(#colorOrders)"
                radius={[4, 4, 0, 0]}
                barSize={activeMetric === 'orders' ? (daysCount > 20 ? 12 : 28) : (daysCount > 20 ? 8 : 16)}
              />
            )}

            {/* Revenue Area (Combined or Revenue view) */}
            {(activeMetric === 'combined' || activeMetric === 'revenue') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenueHT"
                name="Chiffre d'Affaires HT"
                stroke="#d97706"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                dot={daysCount <= 20 ? { r: 3.5, fill: '#d97706', strokeWidth: 1.5, stroke: '#ffffff' } : false}
                activeDot={{ r: 5, fill: '#b45309', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* Profit Line (Combined or Revenue view) */}
            {(activeMetric === 'combined' || activeMetric === 'revenue') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="netProfit"
                name="Bénéfice Net"
                stroke="#10b981"
                strokeWidth={2}
                dot={daysCount <= 20 ? { r: 3, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1 } : false}
                activeDot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

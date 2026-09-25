import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Clock,
  Crown,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetAnalyticsExtended, useIsCallerAdmin } from "../hooks/useQueries";

interface AnalyticsPageProps {
  bookId: string;
}

type TimeFilter =
  | "today"
  | "last7"
  | "last30"
  | "last90"
  | "thisMonth"
  | "thisYear"
  | "all";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "last90", label: "Last 90 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "thisYear", label: "This Year" },
  { key: "all", label: "All Time" },
];

const CHART_COLORS = {
  blue: "hsl(var(--chart-1))",
  teal: "hsl(var(--chart-2))",
  purple: "hsl(var(--chart-3))",
  green: "hsl(var(--chart-4))",
  pink: "hsl(var(--chart-5))",
  amber: "#f59e0b",
  red: "#ef4444",
  orange: "#f97316",
  darkRed: "#991b1b",
  gold: "#d97706",
};

function fmt(n: number): string {
  return `₦${Math.round(n).toLocaleString()}`;
}

function SkeletonChart() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  const skeletons = Array.from({ length: rows }, (_, i) => String(i));
  return (
    <div className="space-y-2">
      {skeletons.map((id) => (
        <Skeleton key={id} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-muted-foreground font-medium">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Try a wider timeframe or add more data.
      </p>
    </div>
  );
}

// Custom tooltip for recharts
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.value > 1000
            ? fmt(p.value)
            : p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── TAB 1: OVERVIEW ──────────────────────────────────────────────────────────

function OverviewTab({
  data,
  isLoading,
}: {
  data: import("../backend").AnalyticsExtended | null;
  isLoading: boolean;
}) {
  const salesTrend = data?.salesTrend ?? [];
  const peakPeriods = data?.peakPeriods ?? [];
  const revenueForecast = data?.revenueForecast ?? [];
  const profitByProduct = (data?.profitByProduct ?? []).slice(0, 10);

  const maxPeakVolume = Math.max(...peakPeriods.map((p) => p.volume), 0);

  // Combine historical + forecast for revenue chart
  const historicalLast = salesTrend.slice(-3);
  const forecastData = [
    ...historicalLast.map((p) => ({ period: p.period, actual: p.revenue })),
    ...revenueForecast.map((p) => ({
      period: `${p.period} (f)`,
      forecast: p.projected,
    })),
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Sales Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Sales Trend — Revenue, Cost & Profit
          </CardTitle>
          <CardDescription>
            3-line chart: revenue (blue), cost (red), profit (green)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : salesTrend.length === 0 ? (
            <EmptyState message="No trend data for this period" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART_COLORS.blue}
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={CHART_COLORS.red}
                  strokeWidth={2}
                  dot={false}
                  name="Cost"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={CHART_COLORS.green}
                  strokeWidth={2}
                  dot={false}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Peak Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Peak Periods
          </CardTitle>
          <CardDescription>
            Highest-volume periods highlighted in gold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : peakPeriods.length === 0 ? (
            <EmptyState message="No peak period data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakPeriods}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="volume" name="Volume" radius={[3, 3, 0, 0]}>
                  {peakPeriods.map((entry) => (
                    <Cell
                      key={entry.period}
                      fill={
                        entry.volume === maxPeakVolume
                          ? CHART_COLORS.gold
                          : CHART_COLORS.blue
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>Next 3 periods projected (dashed)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : forecastData.length === 0 ? (
            <EmptyState message="No forecast data available" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={CHART_COLORS.blue}
                  strokeWidth={2}
                  name="Actual"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={CHART_COLORS.purple}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Forecast"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Profit by Product */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" />
            Profit by Product — Top 10
          </CardTitle>
          <CardDescription>
            Items ranked by gross profit contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : profitByProduct.length === 0 ? (
            <EmptyState message="No product profit data for this period" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left py-2 px-3 w-10">#</th>
                    <th className="text-left py-2 px-3">Item Name</th>
                    <th className="text-right py-2 px-3">Units Sold</th>
                    <th className="text-right py-2 px-3">Gross Profit</th>
                    <th className="text-right py-2 px-3">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {profitByProduct.map((item, i) => (
                    <tr
                      key={item.itemName}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                      data-ocid={`analytics.profit-by-product.item.${i + 1}`}
                    >
                      <td className="py-2.5 px-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {item.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {Number(item.units).toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold tabular-nums ${item.grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}
                      >
                        {fmt(item.grossProfit)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <Badge
                          variant={item.margin >= 20 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.margin.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB 2: SALES ─────────────────────────────────────────────────────────────

function SalesTab({
  data,
  isLoading,
}: {
  data: import("../backend").AnalyticsExtended | null;
  isLoading: boolean;
}) {
  const salesVelocity = (data?.salesVelocity ?? []).slice(0, 20);
  const cogsBreakdown = (data?.cogsBreakdown ?? []).slice(0, 10);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Sales Velocity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Sales Velocity — Top 20
          </CardTitle>
          <CardDescription>
            Average units sold per day per product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : salesVelocity.length === 0 ? (
            <EmptyState message="No velocity data for this period" />
          ) : (
            <ScrollArea className="h-[380px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                      <th className="text-left py-2 px-3 w-10">#</th>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-right py-2 px-3">Avg Units/Day</th>
                      <th className="text-right py-2 px-3">Total Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesVelocity.map((item, i) => (
                      <tr
                        key={item.itemName}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                        data-ocid={`analytics.sales-velocity.item.${i + 1}`}
                      >
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium truncate max-w-[160px]">
                          {item.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {item.avgUnitsPerDay.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {Number(item.totalUnits).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* COGS Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            COGS Breakdown — Top 10 Items
          </CardTitle>
          <CardDescription>Cost vs. Revenue per product</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : cogsBreakdown.length === 0 ? (
            <EmptyState message="No COGS data for this period" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={cogsBreakdown}
                layout="vertical"
                margin={{ left: 8, right: 32 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="opacity-30"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="itemName"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar
                  dataKey="totalCost"
                  name="Cost"
                  fill={CHART_COLORS.red}
                  radius={[0, 3, 3, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="grossProfit"
                  name="Gross Profit"
                  fill={CHART_COLORS.green}
                  radius={[0, 3, 3, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB 3: INVENTORY ─────────────────────────────────────────────────────────

function InventoryTab({
  data,
  isLoading,
}: {
  data: import("../backend").AnalyticsExtended | null;
  isLoading: boolean;
}) {
  const stockTurnover = (data?.stockTurnover ?? []).sort(
    (a, b) => b.turnoverRate - a.turnoverRate,
  );
  const deadStock = (data?.deadStock ?? []).filter(
    (d) => Number(d.daysSinceLastSale) > 30,
  );
  const branchComparison = data?.branchComparison ?? [];

  function turnoverColor(rate: number) {
    if (rate >= 10) return "text-green-600";
    if (rate >= 4) return "text-amber-500";
    return "text-destructive";
  }

  function deadStockBadge(days: number) {
    if (days >= 90)
      return (
        <Badge className="bg-destructive/20 text-destructive text-xs">
          {days}d — Critical
        </Badge>
      );
    if (days >= 60)
      return (
        <Badge className="bg-orange-100 text-orange-700 text-xs">
          {days}d — Warning
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs">
        {days}d
      </Badge>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Stock Turnover */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Stock Turnover Rate
          </CardTitle>
          <CardDescription>
            How fast inventory sells — higher is better
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : stockTurnover.length === 0 ? (
            <EmptyState message="No turnover data available" />
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                      <th className="text-left py-2 px-3">Item Name</th>
                      <th className="text-right py-2 px-3">Turnover Rate</th>
                      <th className="text-right py-2 px-3">Restocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockTurnover.map((item, i) => (
                      <tr
                        key={item.itemName}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                        data-ocid={`analytics.stock-turnover.item.${i + 1}`}
                      >
                        <td className="py-2.5 px-3 font-medium">
                          {item.itemName}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums ${turnoverColor(item.turnoverRate)}`}
                        >
                          {item.turnoverRate.toFixed(2)}x
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {Number(item.timesRestocked)}×
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dead Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Dead Stock — Unsold 30+ Days
          </CardTitle>
          <CardDescription>
            Items that haven't moved — consider discounting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : deadStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="font-medium text-green-600">
                All inventory is moving well!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No dead stock detected.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                      <th className="text-left py-2 px-3">Item Name</th>
                      <th className="text-right py-2 px-3">Days Idle</th>
                      <th className="text-right py-2 px-3">Current Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadStock.map((item, i) => (
                      <tr
                        key={item.itemName}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                        data-ocid={`analytics.dead-stock.item.${i + 1}`}
                      >
                        <td className="py-2.5 px-3 font-medium">
                          {item.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {deadStockBadge(Number(item.daysSinceLastSale))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {Number(item.currentQty).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Branch Comparison */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Branch Comparison
          </CardTitle>
          <CardDescription>
            Stock and sales volume per location — hover for total value
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : branchComparison.length === 0 ? (
            <EmptyState message="No branch data available" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchComparison}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="locationName"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip
                  content={(props) => {
                    const { active, payload, label } = props as {
                      active?: boolean;
                      payload?: Array<{
                        name: string;
                        value: number;
                        color: string;
                      }>;
                      label?: string;
                    };
                    if (!active || !payload?.length) return null;
                    const item = branchComparison.find(
                      (b) => b.locationName === label,
                    );
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                        <p className="font-semibold mb-1">{label}</p>
                        {payload.map((p) => (
                          <p key={p.name} style={{ color: p.color }}>
                            {p.name}: {p.value.toLocaleString()}
                          </p>
                        ))}
                        {item && (
                          <p className="text-muted-foreground text-xs mt-1">
                            Total Value: {fmt(item.totalValue)}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  dataKey="totalItems"
                  name="Total Items"
                  fill={CHART_COLORS.blue}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="salesVolume"
                  name="Sales Volume"
                  fill={CHART_COLORS.green}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB 4: CUSTOMERS ─────────────────────────────────────────────────────────

function CustomersTab({
  data,
  isLoading,
}: {
  data: import("../backend").AnalyticsExtended | null;
  isLoading: boolean;
}) {
  const customerCLV = (data?.customerCLV ?? []).slice(0, 20);
  const topCustomersByProfit = data?.topCustomersByProfit ?? [];
  const repeatVsNew = data?.repeatVsNewRatio ?? [];
  const debtAging = data?.debtAging ?? [];

  // Aggregate repeat vs new across periods for a single pie view
  const totalRepeat = repeatVsNew.reduce(
    (sum, r) => sum + Number(r.repeatCount),
    0,
  );
  const totalNew = repeatVsNew.reduce((sum, r) => sum + Number(r.newCount), 0);
  const totalCustomers = totalRepeat + totalNew;
  const pieData =
    totalCustomers > 0
      ? [
          {
            name: "Repeat Customers",
            value: totalRepeat,
            pct: ((totalRepeat / totalCustomers) * 100).toFixed(1),
          },
          {
            name: "New Customers",
            value: totalNew,
            pct: ((totalNew / totalCustomers) * 100).toFixed(1),
          },
        ]
      : [];

  const agingColors: Record<string, string> = {
    "0-30": CHART_COLORS.amber,
    "31-60": CHART_COLORS.orange,
    "61-90": CHART_COLORS.red,
    "90+": CHART_COLORS.darkRed,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* CLV Ranking */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-gold" style={{ color: "#d97706" }} />
            Customer Lifetime Value — Top 20
          </CardTitle>
          <CardDescription>Ranked by total revenue generated</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : customerCLV.length === 0 ? (
            <EmptyState message="No customer CLV data for this period" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left py-2 px-3 w-10">#</th>
                    <th className="text-left py-2 px-3">Customer Name</th>
                    <th className="text-right py-2 px-3">Total Revenue</th>
                    <th className="text-right py-2 px-3">Transactions</th>
                    <th className="text-right py-2 px-3">First Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {customerCLV.map((c, i) => (
                    <tr
                      key={c.customerName}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                      data-ocid={`analytics.clv.item.${i + 1}`}
                    >
                      <td className="py-2.5 px-3">
                        {i === 0 ? (
                          <Crown
                            className="h-5 w-5"
                            style={{ color: "#d97706" }}
                          />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {i + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {c.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-green-600">
                        {fmt(c.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {Number(c.totalTransactions)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">
                        {c.firstTransactionDate > 0
                          ? new Date(
                              Number(c.firstTransactionDate) / 1_000_000,
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repeat vs New Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Repeat vs. New Customers
          </CardTitle>
          <CardDescription>
            Ratio of returning to first-time buyers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : pieData.length === 0 ? (
            <EmptyState message="No customer ratio data" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, pct }: { name: string; pct: string }) =>
                      `${name}: ${pct}%`
                    }
                  >
                    <Cell fill={CHART_COLORS.blue} />
                    <Cell fill={CHART_COLORS.teal} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-6 text-sm mt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {totalRepeat.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Repeat</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {totalNew.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers by Profit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" />
            Top Customers by Profit
          </CardTitle>
          <CardDescription>
            Customers generating the most gross profit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={8} />
          ) : topCustomersByProfit.length === 0 ? (
            <EmptyState message="No profit data by customer" />
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                      <th className="text-left py-2 px-3 w-10">#</th>
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-right py-2 px-3">Gross Profit</th>
                      <th className="text-right py-2 px-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomersByProfit.map((c, i) => (
                      <tr
                        key={c.customerName}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                        data-ocid={`analytics.top-profit-customers.item.${i + 1}`}
                      >
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {c.customerName}
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums text-green-600">
                          {fmt(c.grossProfit)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                          {fmt(c.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Debt Aging Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-destructive" />
            Debt Aging — Overdue Credit Sales
          </CardTitle>
          <CardDescription>
            Outstanding amounts grouped by how long they've been unpaid
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : debtAging.length === 0 ? (
            <EmptyState message="No overdue debts — all clear!" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={debtAging}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="bucketLabel"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="totalAmount"
                  name="Amount Overdue"
                  radius={[4, 4, 0, 0]}
                >
                  {debtAging.map((entry) => (
                    <Cell
                      key={entry.bucketLabel}
                      fill={
                        agingColors[entry.bucketLabel] ?? CHART_COLORS.amber
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB 5: OPERATIONS ────────────────────────────────────────────────────────

function OperationsTab({
  data,
  isLoading,
}: {
  data: import("../backend").AnalyticsExtended | null;
  isLoading: boolean;
}) {
  const expenseByCategory = data?.expenseByCategory ?? [];
  const marginTrend = data?.marginTrend ?? [];
  const breakEven = data?.breakEven;
  const approvalTurnaround = data?.approvalTurnaround;
  const userActivity = (data?.userActivity ?? []).slice(0, 10);
  const errorRate = data?.transactionErrorRate;

  const EXPENSE_COLORS = [
    CHART_COLORS.blue,
    CHART_COLORS.teal,
    CHART_COLORS.purple,
    CHART_COLORS.green,
    CHART_COLORS.pink,
    CHART_COLORS.amber,
    CHART_COLORS.orange,
  ];

  const totalApproved = Number(errorRate?.totalApproved ?? 0);
  const totalRejected = Number(errorRate?.totalRejected ?? 0);
  const totalSubmitted = Number(errorRate?.totalSubmitted ?? 1);
  const approvedPct = Math.round((totalApproved / totalSubmitted) * 100);
  const rejectedPct = Math.round((totalRejected / totalSubmitted) * 100);

  const errorRateDonut = [
    { name: "Approved", value: totalApproved },
    { name: "Rejected", value: totalRejected },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Expense Breakdown by Category
          </CardTitle>
          <CardDescription>How your expenses are distributed</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : expenseByCategory.length === 0 ? (
            <EmptyState message="No expense data for this period" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  dataKey="amount"
                  nameKey="category"
                  cx="45%"
                  cy="50%"
                  outerRadius={90}
                  label={({
                    category,
                    pct,
                  }: { category: string; pct: number }) =>
                    `${category}: ${pct.toFixed(1)}%`
                  }
                >
                  {expenseByCategory.map((cat, i) => (
                    <Cell
                      key={cat.category}
                      fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Margin Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Gross Margin Trend (%)
          </CardTitle>
          <CardDescription>Track your margin health over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : marginTrend.length === 0 ? (
            <EmptyState message="No margin trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={marginTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="grossMarginPct"
                  name="Margin %"
                  stroke={CHART_COLORS.blue}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_COLORS.blue }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Break-even Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Break-Even Analysis
          </CardTitle>
          <CardDescription>
            Operating break-even: realized gross profit covers expenses when net
            margin reaches zero. Unpaid credit is not profit. This is actual
            cost-recovery performance, not a forecast sales target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={4} />
          ) : !breakEven ? (
            <EmptyState message="No break-even data available" />
          ) : (
            <div className="space-y-3" data-ocid="analytics.break-even">
              {[
                {
                  label: "Total Expenses",
                  value: fmt(breakEven.totalExpenses),
                  color: "text-destructive",
                },
                {
                  label: "Gross profit needed to cover expenses",
                  value: fmt(breakEven.requiredRevenue),
                  color: "text-amber-500",
                },
                {
                  label: "Realized gross profit",
                  value: fmt(breakEven.currentRevenue),
                  color: "text-primary",
                },
                {
                  label:
                    breakEven.surplus >= 0
                      ? "Net profit (above break-even)"
                      : "Net loss (below break-even)",
                  value: fmt(Math.abs(breakEven.surplus)),
                  color:
                    breakEven.surplus >= 0
                      ? "text-green-600"
                      : "text-destructive",
                  highlight: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between p-3 rounded-lg ${row.highlight ? (breakEven.surplus >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-destructive/10") : "bg-muted/30"}`}
                >
                  <span className="text-sm text-muted-foreground font-medium">
                    {row.label}
                  </span>
                  <span
                    className={`font-bold text-lg tabular-nums ${row.color}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Turnaround */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Approval Turnaround Stats
          </CardTitle>
          <CardDescription>
            How quickly admins process pending items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : !approvalTurnaround ? (
            <EmptyState message="No approval data available" />
          ) : (
            <div
              className="grid grid-cols-2 gap-3"
              data-ocid="analytics.approval-turnaround"
            >
              {[
                {
                  label: "Avg Approval Time",
                  value: `${approvalTurnaround.avgHours.toFixed(1)}h`,
                  icon: "⏱",
                },
                {
                  label: "Fastest",
                  value: `${approvalTurnaround.fastestHours.toFixed(1)}h`,
                  icon: "⚡",
                  color: "text-green-600",
                },
                {
                  label: "Slowest",
                  value: `${approvalTurnaround.slowestHours.toFixed(1)}h`,
                  icon: "🐢",
                  color: "text-amber-500",
                },
                {
                  label: "Total Approved",
                  value: Number(
                    approvalTurnaround.totalApproved,
                  ).toLocaleString(),
                  icon: "✅",
                  color: "text-green-600",
                },
                {
                  label: "Total Rejected",
                  value: Number(
                    approvalTurnaround.totalRejected,
                  ).toLocaleString(),
                  icon: "❌",
                  color: "text-destructive",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="metric-card flex items-center gap-3"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p
                      className={`text-xl font-bold ${s.color ?? "text-foreground"}`}
                    >
                      {s.value}
                    </p>
                    <p className="metric-label">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            User Activity — Top 10
          </CardTitle>
          <CardDescription>
            Most active team members by action count
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={6} />
          ) : userActivity.length === 0 ? (
            <EmptyState message="No user activity data" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left py-2 px-3">User</th>
                    <th className="text-right py-2 px-3">Actions</th>
                    <th className="text-right py-2 px-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.map((u, i) => (
                    <tr
                      key={u.principalText}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "table-row-alt" : ""}`}
                      data-ocid={`analytics.user-activity.item.${i + 1}`}
                    >
                      <td className="py-2 px-3 font-medium">{u.userName}</td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums text-primary">
                        {Number(u.actionCount).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground text-xs">
                        {u.lastActionDate > 0
                          ? new Date(
                              Number(u.lastActionDate) / 1_000_000,
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Error Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Transaction Error Rate
          </CardTitle>
          <CardDescription>
            Ratio of approved vs rejected submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonChart />
          ) : !errorRate ? (
            <EmptyState message="No error rate data" />
          ) : (
            <div
              className="flex flex-col items-center gap-4"
              data-ocid="analytics.error-rate"
            >
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={errorRateDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                  >
                    <Cell fill={CHART_COLORS.green} />
                    <Cell fill={CHART_COLORS.red} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-8 text-sm">
                <div className="text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: CHART_COLORS.green }}
                  >
                    {approvedPct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Approved ({totalApproved})
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: CHART_COLORS.red }}
                  >
                    {rejectedPct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rejected ({totalRejected})
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {totalSubmitted}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AnalyticsPage({ bookId }: AnalyticsPageProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("thisMonth");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin(bookId);
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError,
    refetch,
  } = useGetAnalyticsExtended(bookId, timeFilter);

  const isLoading = analyticsLoading;
  const timeframeLabel =
    TIME_FILTERS.find((f) => f.key === timeFilter)?.label ?? "This Month";

  if (adminLoading) {
    return (
      <div className="space-y-6 p-4" data-ocid="analytics.page">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-5">
          {["a", "b", "c", "d", "e"].map((id) => (
            <Skeleton key={id} className="h-9 w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {["w", "x", "y", "z"].map((id) => (
            <Skeleton key={id} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="analytics.page"
      >
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-10 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Admin Access Required
            </h2>
            <p className="text-muted-foreground">
              Only administrators can view analytics and reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="analytics.page">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Comprehensive business insights — {timeframeLabel}
          </p>
        </div>
        {isError && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-ocid="analytics.retry_button"
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>

      {/* Timeframe Filter */}
      <div
        className="overflow-x-auto pb-1 -mx-1 px-1"
        data-ocid="analytics.timeframe-filter"
      >
        <div className="inline-flex gap-1.5 bg-muted/40 p-1 rounded-lg border border-border">
          {TIME_FILTERS.map((f) => (
            <button
              type="button"
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                timeFilter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
              data-ocid={`analytics.timeframe.${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {isError && !analyticsData && (
        <Card>
          <CardContent
            className="p-8 text-center"
            data-ocid="analytics.error_state"
          >
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">
              Failed to load analytics
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Check your connection and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-0.5 bg-muted/40">
          {[
            { key: "overview", label: "Overview" },
            { key: "sales", label: "Sales" },
            { key: "inventory", label: "Inventory" },
            { key: "customers", label: "Customers" },
            { key: "operations", label: "Operations" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-sm px-4 py-2"
              data-ocid={`analytics.tab.${tab.key}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab data={analyticsData ?? null} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="sales" className="mt-5">
          <SalesTab data={analyticsData ?? null} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-5">
          <InventoryTab data={analyticsData ?? null} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="customers" className="mt-5">
          <CustomersTab data={analyticsData ?? null} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="operations" className="mt-5">
          <OperationsTab data={analyticsData ?? null} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

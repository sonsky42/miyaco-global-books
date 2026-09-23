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
            …14537 tokens truncated…ocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Aging Report ──────────────────────────────────────────────────────────────

const AGING_COLORS: Record<
  string,
  { bg: string; bar: string; text: string; border: string }
> = {
  "0-30": {
    bg: "bg-amber-50",
    bar: "bg-amber-400",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  "31-60": {
    bg: "bg-orange-50",
    bar: "bg-orange-500",
    text: "text-orange-800",
    border: "border-orange-200",
  },
  "61-90": {
    bg: "bg-red-50",
    bar: "bg-red-500",
    text: "text-red-800",
    border: "border-red-200",
  },
  "90+": {
    bg: "bg-rose-100",
    bar: "bg-rose-700",
    text: "text-rose-900",
    border: "border-rose-300",
  },
};

function agingColor(bucketLabel: string) {
  const key = Object.keys(AGING_COLORS).find(
    (k) =>
      bucketLabel.toLowerCase().includes(k.replace("+", "").toLowerCase()) ||
      bucketLabel.toLowerCase().includes(k.toLowerCase()),
  );
  return AGING_COLORS[key ?? "90+"] ?? AGING_COLORS["90+"];
}

function AgingBucketRow({
  bucket,
  maxAmount,
}: { bucket: AgingBucket; maxAmount: number }) {
  const [expanded, setExpanded] = useState(false);
  const colors = agingColor(bucket.bucketLabel);
  const pct = maxAmount > 0 ? (bucket.totalAmount / maxAmount) * 100 : 0;

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
      <button
        type="button"
        className={`w-full text-left p-4 ${colors.bg} hover:brightness-95 transition-all`}
        onClick={() => setExpanded((v) => !v)}
        data-ocid="customers.aging.bucket.toggle"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`font-bold text-base ${colors.text}`}>
                {bucket.bucketLabel}
              </span>
              <Badge
                className={`${colors.bg} ${colors.text} ${colors.border} border text-xs`}
              >
                {Number(bucket.count)}{" "}
                {Number(bucket.count) === 1 ? "invoice" : "invoices"}
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold ${colors.text}`}>
              {fmtNaira(bucket.totalAmount)}
            </p>
            <p className="text-xs text-muted-foreground">overdue</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>

      {expanded && bucket.transactions.length > 0 && (
        <div className="border-t bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2 hidden sm:table-cell">
                  Item
                </th>
                <th className="text-right px-4 py-2">Amount Owed</th>
                <th className="text-right px-4 py-2 hidden md:table-cell">
                  Due Date
                </th>
                <th className="text-right px-4 py-2">Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {bucket.transactions.map((tx, i) => {
                const daysOverdue = tx.date
                  ? Math.floor(
                      (Date.now() - Number(tx.date) / 1_000_000) /
                        (1000 * 60 * 60 * 24),
                    )
                  : 0;
                return (
                  <tr
                    key={tx.id || i}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2 font-medium">
                      {tx.customerName || "—"}
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">
                      {tx.itemName || "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${colors.text}`}
                    >
                      {fmtNaira(tx.amount)}
                    </td>
                    <td className="px-4 py-2 text-right hidden md:table-cell text-xs text-muted-foreground">
                      {fmtDate(tx.date)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${colors.text}`}
                    >
                      {daysOverdue > 0 ? `${daysOverdue}d` : "Due today"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AgingReportTab({ bookId }: { bookId: string }) {
  const { data: buckets = [], isLoading } = useGetAgingReport(bookId);

  const totalOverdue = useMemo(
    () => buckets.reduce((sum, b) => sum + b.totalAmount, 0),
    [buckets],
  );
  const maxAmount = useMemo(
    () => Math.max(...buckets.map((b) => b.totalAmount), 1),
    [buckets],
  );
  const hasOverdue = buckets.some(
    (b) => Number(b.count) > 0 && b.totalAmount > 0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-destructive" />
              Aging Report
            </CardTitle>
            <CardDescription>
              Overdue credit sales grouped by how long they've been unpaid
            </CardDescription>
          </div>
          {hasOverdue && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Total Overdue</p>
              <p className="text-2xl font-bold text-destructive">
                {fmtNaira(totalOverdue)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {(["a", "b", "c", "d"] as const).map((k) => (
              <div key={k} className="p-4 border rounded-lg">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : !hasOverdue ? (
          <div
            className="text-center py-16"
            data-ocid="customers.aging.empty_state"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <p className="font-semibold text-lg">All balances current! ✓</p>
            <p className="text-sm text-muted-foreground mt-1">
              No overdue credit sales. Great work!
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-ocid="customers.aging.list">
            {buckets
              .filter((b) => Number(b.count) > 0 || b.totalAmount > 0)
              .map((bucket) => (
                <AgingBucketRow
                  key={bucket.bucketLabel}
                  bucket={bucket}
                  maxAmount={maxAmount}
                />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Customer Row ──────────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  onViewStatement,
}: {
  customer: Customer;
  onViewStatement: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { actor } = useActor();
  const { data: isAdmin } = useIsCallerAdmin(customer.bookId);
  const { data: photo = "" } = useQuery({
    queryKey: ["customerPhoto", customer.bookId, customer.name],
    queryFn: () => actor!.getCustomerPhoto(customer.bookId, customer.name),
    enabled: !!actor,
  });
  const savePhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!actor) throw new Error("Connection unavailable");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 200_000) {
        throw new Error("Choose a JPEG, PNG or WebP photo smaller than 200 KB");
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read photo"));
        reader.readAsDataURL(file);
      });
      await actor.setCustomerPhoto(customer.bookId, customer.name, data);
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => toast.success("Customer photo saved"),
  });
  const hasDebt = customer.outstandingDebt > 0;

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all"
      data-ocid="customers.customer.card"
    >
      <div className="w-full p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex-1 text-left min-w-0"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {photo && <img src={photo} alt={`${customer.name}'s profile`} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />}
            <span className="font-semibold truncate">{customer.name}</span>
            {hasDebt && (
              <Badge variant="destructive" className="text-xs shrink-0">
                Owes {fmtNaira(customer.outstandingDebt)}
              </Badge>
            )}
            {customer.brand && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {customer.brand}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {customer.email}
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">
              {fmtNaira(customer.totalSpent)}
            </p>
            <p className="text-xs text-muted-foreground">Total spent</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewStatement(customer.name);
            }}
            data-ocid="customers.view_statement.button"
          >
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Statement</span>
          </Button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 hover:bg-muted rounded"
            aria-label="Toggle details"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          {isAdmin && <label className="block pt-4 text-sm">
            Customer photo (JPEG, PNG or WebP, maximum 200 KB)
            <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={savePhoto.isPending} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) savePhoto.mutate(file);
              event.target.value = "";
            }} />
            {savePhoto.isPending && <span role="status">Saving photo…</span>}
          </label>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Total Spent</p>
              <p className="font-semibold text-emerald-600">
                {fmtNaira(customer.totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                Outstanding Debt
              </p>
              <p
                className={`font-semibold ${hasDebt ? "text-destructive" : "text-muted-foreground"}`}
              >
                {hasDebt ? fmtNaira(customer.outstandingDebt) : "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Transactions</p>
              <p className="font-semibold">
                {Number(customer.transactionCount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                Last Transaction
              </p>
              <p className="font-semibold text-xs">
                {fmtDate(customer.lastTransactionDate)}
              </p>
            </div>
          </div>
          {customer.transactions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Transaction IDs
              </p>
              <div className="flex flex-wrap gap-1">
                {customer.transactions.slice(0, 6).map((txId) => (
                  <span
                    key={txId}
                    className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-[120px]"
                  >
                    {txId}
                  </span>
                ))}
                {customer.transactions.length > 6 && (
                  <span className="text-xs text-muted-foreground">
                    +{customer.transactions.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage({ bookId }: CustomersPageProps) {
  const { data: customers = [], isLoading: customersLoading } =
    useGetCustomers(bookId);
  const { data: metrics, isLoading: metricsLoading } =
    useGetDashboardMetrics(bookId);
  const { data: credits, isLoading: creditsLoading } =
    useGetOutstandingCredits(bookId);

  const [statementCustomer, setStatementCustomer] = useState<string | null>(
    null,
  );

  // URL-persisted search
  const [searchValue, setSearchValue] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("customerSearch") ?? "";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchValue) {
      params.set("customerSearch", searchValue);
    } else {
      params.delete("customerSearch");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [searchValue]);

  const fuse = useMemo(() => new Fuse(customers, FUSE_OPTIONS), [customers]);

  const filteredCustomers = useMemo((): Customer[] => {
    if (!searchValue.trim()) return customers;
    return fuse.search(searchValue).map((r) => r.item);
  }, [searchValue, customers, fuse]);

  const isLoading = customersLoading || metricsLoading || creditsLoading;
  const totalCustomers = metrics
    ? Number(metrics.totalCustomers)
    : customers.length;
  const customersWithDebt = credits ? Number(credits.customersWithDebt) : 0;
  const totalOutstanding = credits ? credits.totalOutstanding : 0;

  return (
    <div className="space-y-6" data-ocid="customers.page">
      <div>
        <h1 className="text-3xl font-bold mb-2">Customers</h1>
        <p className="text-muted-foreground">
          Track customer profiles, statements, aging debts, and outstanding
          balances
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          (["c1", "c2", "c3"] as const).map((k) => (
            <Card key={k}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card data-ocid="customers.total-customers.card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Auto-tracked unique profiles
                </p>
              </CardContent>
            </Card>

            <Card data-ocid="customers.outstanding-debts.card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Outstanding Debts
                </CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {fmtNaira(totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total unpaid credit sales
                </p>
              </CardContent>
            </Card>

            <Card data-ocid="customers.customers-with-debt.card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customers with Debt
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {customersWithDebt}
                </div>
                <p className="text-xs text-muted-foreground">
                  Customers with outstanding balance
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory" data-ocid="customers.directory.tab">
            Customer Directory
          </TabsTrigger>
          <TabsTrigger value="credits" data-ocid="customers.credits.tab">
            Outstanding Credits
          </TabsTrigger>
          <TabsTrigger value="aging" data-ocid="customers.aging.tab">
            Aging Report
          </TabsTrigger>
        </TabsList>

        {/* ── Directory Tab ── */}
        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <CardTitle>Customer Directory</CardTitle>
                  <CardDescription>
                    All auto-tracked customers · click "Statement" for full
                    account history
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, email…"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9"
                    data-ocid="customers.search_input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="space-y-3">
                  {(["s1", "s2", "s3", "s4", "s5"] as const).map((k) => (
                    <div key={k} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div
                  className="text-center py-16"
                  data-ocid="customers.directory.empty_state"
                >
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  {searchValue ? (
                    <>
                      <p className="font-semibold text-muted-foreground">
                        No customers match "{searchValue}"
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try a different search term
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-muted-foreground">
                        No customers yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customer profiles are created automatically when you
                        record transactions
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div
                    className="space-y-2"
                    data-ocid="customers.directory.list"
                  >
                    {filteredCustomers.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        onViewStatement={setStatementCustomer}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Outstanding Credits Tab ── */}
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                Outstanding Credits
              </CardTitle>
              <CardDescription>
                Customers with unpaid credit sales balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creditsLoading ? (
                <div className="space-y-3">
                  {(["r1", "r2", "r3"] as const).map((k) => (
                    <div key={k} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ))}
                </div>
              ) : !credits || credits.outstandingCredits.length === 0 ? (
                <div
                  className="text-center py-12"
                  data-ocid="customers.credits.empty_state"
                >
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold text-muted-foreground">
                    No outstanding credits
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All credit sales have been settled
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {credits.outstandingCredits.map((credit) => (
                      <div
                        key={credit.debtor}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {credit.debtor}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {fmtDate(credit.paybackDate)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Balance
                              </p>
                              <p className="text-xl font-bold text-destructive">
                                {fmtNaira(credit.balance)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1"
                              onClick={() =>
                                setStatementCustomer(credit.debtor)
                              }
                              data-ocid="customers.credits.view_statement.button"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                Statement
                              </span>
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Total Owed
                            </p>
                            <p className="font-medium">
                              {fmtNaira(credit.totalOwed)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Amount Paid
                            </p>
                            <p className="font-medium text-emerald-600">
                              {fmtNaira(credit.amountPaid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Remaining
                            </p>
                            <p className="font-medium text-destructive">
                              {fmtNaira(credit.balance)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aging Report Tab ── */}
        <TabsContent value="aging">
          <AgingReportTab bookId={bookId} />
        </TabsContent>
      </Tabs>

      {/* Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          bookId={bookId}
          customerName={statementCustomer}
          onClose={() => setStatementCustomer(null)}
        />
      )}
    </div>
  );
}

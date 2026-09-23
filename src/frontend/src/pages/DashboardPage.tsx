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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CreditCard,
  Info,
  Package,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetAnalyticsExtended,
  useGetDashboardMetrics,
  useGetOrGenerateScheduledSummary,
  useGetTransactions,
} from "../hooks/useQueries";

interface DashboardPageProps {
  bookId: string;
  onNavigate?: (page: string) => void;
}

type TxType = "Sales" | "Credit Sales" | "Purchases" | "Credit Purchases";
type DashTimeframe = "today" | "week" | "month" | "year";

const DASH_TIMEFRAMES: { key: DashTimeframe; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

function getStartDate(key: DashTimeframe): Date {
  const now = new Date();
  switch (key) {
    case "today":
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
    case "week": {
      const day = now.getDay();
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day,
        0,
        0,
        0,
        0,
      );
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    case "year":
      return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }
}

const TYPE_CONFIG: Record<
  TxType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Sales: {
    label: "Sales",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <ShoppingCart className="h-3 w-3" />,
  },
  "Credit Sales": {
    label: "Credit Sales",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <CreditCard className="h-3 w-3" />,
  },
  Purchases: {
    label: "Purchases",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <ShoppingBag className="h-3 w-3" />,
  },
  "Credit Purchases": {
    label: "Credit Purchases",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <Receipt className="h-3 w-3" />,
  },
};

function TransactionTypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type as TxType] ?? TYPE_CONFIG.Sales;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SummarySkeleton() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

function ProfitTableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Error Card ───────────────────────────────────────────────────────────────
function ErrorCard({
  message,
  onRetry,
}: { message?: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive/70" />
        <p className="text-sm text-muted-foreground text-center">
          {message || "Could not load this section. Please try again."}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scheduled Summary Card ────────────────────────────────────────────────────
function ScheduledSummaryCard({ bookId }: { bookId: string }) {
  const {
    data: summary,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetOrGenerateScheduledSummary(bookId);

  if (isLoading) return <SummarySkeleton />;
  if (isError)
    return (
      <ErrorCard
        message="Could not load business summary."
        onRetry={() => refetch()}
      />
    );

  if (!summary) {
    return (
      <Card
        className="border-primary/20 bg-primary/5"
        data-ocid="dashboard.summary.card"
      >
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Sparkles className="h-8 w-8 text-primary/60" />
          <p className="text-muted-foreground font-medium">
            Summary generating…
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-ocid="dashboard.summary.generate_button"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Generate Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const generatedDate = new Date(Number(summary.generatedAt) / 1_000_000);

  return (
    <Card
      className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent"
      data-ocid="dashboard.summary.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Latest Business Summary
            </CardTitle>
            <CardDescription className="mt-0.5">
              {summary.periodLabel} &middot; Generated{" "}
              {generatedDate.toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Regenerate summary"
            data-ocid="dashboard.summary.refresh_button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Inflows</p>
            <p className="text-sm font-bold text-emerald-600">
              ₦{Math.round(summary.totalInflows).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
            <p
              className={`text-sm font-bold ${summary.grossMargin >= 0 ? "text-primary" : "text-destructive"}`}
            >
              ₦{Math.round(summary.grossMargin).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-sm font-bold text-amber-600">
              ₦{Math.round(summary.totalExpenses).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-background/80 border border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-sm font-bold">
              {Number(summary.transactionCount).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summary.topItemNames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Top Items
              </p>
              <div className="space-y-1">
                {summary.topItemNames.slice(0, 4).map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 text-sm"
                    data-ocid={`dashboard.summary.top-item.${i + 1}`}
                  >
                    <span className="text-xs text-muted-foreground w-4">
                      {i + 1}.
                    </span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.topCustomerNames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Top Customers
              </p>
              <div className="space-y-1">
                {summary.topCustomerNames.slice(0, 4).map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 text-sm"
                    data-ocid={`dashboard.summary.top-customer.${i + 1}`}
                  >
                    <span className="text-xs text-muted-foreground w-4">
                      {i + 1}.
                    </span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Profit by Product Mini-Table ──────────────────────────────────────────────
function ProfitByProductCard({
  bookId,
  onNavigate,
}: {
  bookId: string;
  onNavigate?: (page: string) => void;
}) {
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useGetAnalyticsExtended(bookId, "all");

  if (isLoading) return <ProfitTableSkeleton />;
  if (isError)
    return (
      <ErrorCard
        message="Could not load profit data."
        onRetry={() => refetch()}
      />
    );

  const rows = (analytics?.profitByProduct ?? [])
    .slice()
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5);

  return (
    <Card data-ocid="dashboard.profit-by-product.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Profit by Product
            </CardTitle>
            <CardDescription>Top 5 items by gross profit</CardDescription>
          </div>
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary shrink-0 -mr-2"
              onClick={() => onNavigate("analytics")}
              data-ocid="dashboard.profit-by-product.see-analytics-link"
            >
              Full Analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div
            className="text-center py-8"
            data-ocid="dashboard.profit-by-product.empty_state"
          >
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No sales recorded yet
            </p>
          </div>
        ) : (
          <div
            className="space-y-1"
            data-ocid="dashboard.profit-by-product.list"
          >
            <div className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 px-2 pb-1 border-b">
              <span />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Item
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                Gross Profit
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                Margin
              </span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.itemName}
                className={`grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 items-center px-2 py-2 rounded-lg ${i === 0 ? "bg-amber-50 border border-amber-200/80" : "hover:bg-accent/30"} transition-colors`}
                data-ocid={`dashboard.profit-by-product.item.${i + 1}`}
              >
                <span className="flex items-center justify-center">
                  {i === 0 ? (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium truncate min-w-0">
                  {row.itemName}
                </span>
                <span
                  className={`text-sm font-semibold text-right tabular-nums ${row.grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}
                >
                  ₦{Math.round(row.grossProfit).toLocaleString()}
                </span>
                <span className="text-xs text-right tabular-nums text-muted-foreground w-12">
                  {row.margin.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage({
  bookId,
  onNavigate,
}: DashboardPageProps) {
  const [timeframe, setTimeframe] = useState<DashTimeframe>("month");
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useGetDashboardMetrics(bookId);
  const {
    data: allTransactions = [],
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useGetTransactions(bookId);

  const recentTransactions = metrics?.recentTransactions ?? [];

  // Period-filtered inflows and gross margin
  const { periodInflows, periodGrossMargin } = useMemo(() => {
    if (txError) return { periodInflows: 0, periodGrossMargin: 0 };
    const startMs = getStartDate(timeframe).getTime();
    const endMs = Date.now();
    const filtered = allTransactions.filter((tx) => {
      if (!tx.approved) return false;
      const txMs = Number(tx.date) / 1_000_000;
      return txMs >= startMs && txMs <= endMs;
    });
    let inflows = 0;
    let grossMargin = 0;
    for (const tx of filtered) {
      const isSaleType =
        tx.typeSubtype === "Sales" || tx.typeSubtype === "Credit Sales";
      if (isSaleType) {
        const totalUnits = Number(tx.cartons) * Number(tx.unitsPerCarton);
        inflows += tx.amount;
        grossMargin +=
          ((tx.sellingPriceAtSale ?? 0) - (tx.costPriceAtSale ?? 0)) *
          totalUnits;
      }
    }
    return { periodInflows: inflows, periodGrossMargin: grossMargin };
  }, [allTransactions, timeframe, txError]);

  const timeframeLabel =
    DASH_TIMEFRAMES.find((t) => t.key === timeframe)?.label ?? "This Month";

  // If metrics are loading, show skeletons — but only for the metric cards
  const showMetricSkeletons = metricsLoading && !metrics && !metricsError;

  const totalCustomers = metrics ? Number(metrics.totalCustomers) : 0;
  const customersWithDebt = metrics ? Number(metrics.customersWithDebt) : 0;
  const totalOutstandingDebt = metrics
    ? Number(metrics.totalOutstandingDebt)
    : 0;
  const inventoryItems = metrics ? Number(metrics.inventoryItems) : 0;
  const lowStockAlerts = metrics ? Number(metrics.lowStockAlerts) : 0;

  return (
    <div className="space-y-6" data-ocid="dashboard.page">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business performance
        </p>
      </div>

      {/* Timeframe filter */}
      <div data-ocid="dashboard.timeframe-filter">
        <Tabs
          value={timeframe}
          onValueChange={(v) => setTimeframe(v as DashTimeframe)}
        >
          <TabsList>
            {DASH_TIMEFRAMES.map((opt) => (
              <TabsTrigger
                key={opt.key}
                value={opt.key}
                data-ocid={`dashboard.timeframe.${opt.key}`}
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Key Financial Metrics */}
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        data-ocid="dashboard.loading_state"
      >
        {/* Total Inflows */}
        <Card data-ocid="dashboard.total-inflows.card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : txError ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchTx()}
                className="text-destructive gap-1 p-0 h-auto"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600">
                  &#8358;{Math.round(periodInflows).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total Inflows (Sales + Credit Sales) &middot; {timeframeLabel}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Gross Margin */}
        <Card data-ocid="dashboard.gross-margin.card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : txError ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchTx()}
                className="text-destructive gap-1 p-0 h-auto"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${periodGrossMargin >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  &#8358;{Math.round(periodGrossMargin).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  Gross Margin &middot; Selling value minus cost value of items
                  sold
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card data-ocid="dashboard.total-customers.card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {showMetricSkeletons ? (
              <Skeleton className="h-8 w-16" />
            ) : metricsError ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchMetrics()}
                className="text-destructive gap-1 p-0 h-auto"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Unique customer profiles
                </p>
                {customersWithDebt > 0 && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-600 font-medium">
                      ₦{Math.round(totalOutstandingDebt).toLocaleString()} owed
                      by {customersWithDebt}{" "}
                      {customersWithDebt === 1 ? "customer" : "customers"}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory Items */}
        <Card data-ocid="dashboard.inventory-items.card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Items
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {showMetricSkeletons ? (
              <Skeleton className="h-8 w-16" />
            ) : metricsError ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchMetrics()}
                className="text-destructive gap-1 p-0 h-auto"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            ) : (
              <>
                <div className="text-2xl font-bold">{inventoryItems}</div>
                <p className="text-xs text-muted-foreground">
                  {lowStockAlerts > 0 ? (
                    <span className="text-destructive">
                      {lowStockAlerts} low stock{" "}
                      {lowStockAlerts === 1 ? "alert" : "alerts"}
                    </span>
                  ) : (
                    "All items well-stocked"
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert — only show when we actually have data */}
      {!metricsError && lowStockAlerts > 0 && metrics?.lowStockItems && (
        <Card
          className="border-destructive/50 bg-destructive/5"
          data-ocid="dashboard.low-stock.card"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              {lowStockAlerts}{" "}
              {lowStockAlerts === 1 ? "item needs" : "items need"} restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.lowStockItems.map(([name, cartons, units]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 border rounded-lg border-destructive/20"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {Number(cartons)}{" "}
                      {Number(cartons) === 1 ? "carton" : "cartons"} left
                      {Number(units) > 0 && ` (${Number(units)} units)`}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Low Stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!metricsError && !metricsLoading && lowStockAlerts === 0 && (
        <Card
          className="border-emerald-500/50 bg-emerald-500/5"
          data-ocid="dashboard.well-stocked.card"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-700">
                  All items well-stocked
                </p>
                <p className="text-sm text-muted-foreground">
                  No low-stock alerts at this time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Summary + Profit by Product — each handles its own error */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScheduledSummaryCard bookId={bookId} />
        <ProfitByProductCard bookId={bookId} onNavigate={onNavigate} />
      </div>

      {/* Recent Transactions */}
      <Card data-ocid="dashboard.recent-transactions.card">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest 20 transactions sorted by date — newest first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading && !metrics ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : metricsError ? (
            <div
              className="text-center py-10"
              data-ocid="dashboard.recent-transactions.error_state"
            >
              <AlertCircle className="h-8 w-8 text-destructive/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Could not load recent transactions
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMetrics()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Retry
              </Button>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div
              className="text-center py-12"
              data-ocid="dashboard.recent-transactions.empty_state"
            >
              <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No transactions yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear here once recorded
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[520px] pr-4">
              <div
                className="space-y-2"
                data-ocid="dashboard.recent-transactions.list"
              >
                {recentTransactions
                  .slice()
                  .sort((a, b) => Number(b.date) - Number(a.date))
                  .slice(0, 20)
                  .map((tx, idx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/40 transition-colors gap-3"
                      data-ocid={`dashboard.recent-transactions.item.${idx + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <TransactionTypeBadge type={tx.typeSubtype} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              Number(tx.date) / 1_000_000,
                            ).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="font-medium truncate text-sm">
                          {tx.customerName}
                        </p>
                        {tx.itemName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.itemName}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          {tx.currency === "NGN" ? "₦" : "$"}
                          {Number(tx.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(tx.cartons)} cartons ×{" "}
                          {Number(tx.unitsPerCarton)} units ={" "}
                          {Number(tx.cartons) * Number(tx.unitsPerCarton)} units
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

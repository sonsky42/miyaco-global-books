import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Mail,
  Phone,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AgingBucket, Customer, Transaction } from "../backend";
import {
  DebtPayments,
  TransactionLink,
  useSettlements,
} from "../components/LedgerControls";
import { useActor } from "../hooks/useActor";
import {
  useGetAgingReport,
  useGetCustomerStatement,
  useGetCustomers,
  useGetDashboardMetrics,
  useGetOutstandingCredits,
  useIsCallerAdmin,
} from "../hooks/useQueries";

interface CustomersPageProps {
  bookId: string;
}

const FUSE_OPTIONS = {
  keys: ["name", "phone", "email", "brand"],
  threshold: 0.35,
  includeScore: true,
};

function fmtNaira(val: number) {
  return `₦${Math.round(val).toLocaleString()}`;
}

function fmtDate(timestamp: bigint) {
  if (!timestamp || Number(timestamp) === 0) return "—";
  return new Date(Number(timestamp) / 1_000_000).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function txTypeBadge(typeSubtype: string) {
  const t = (typeSubtype ?? "").toLowerCase().replace(/[_-]/g, " ");
  if (t.includes("credit sale"))
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
        Credit Sale
      </Badge>
    );
  if (t.includes("sale"))
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
        Sale
      </Badge>
    );
  if (t.includes("credit purchase"))
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
        Credit Purchase
      </Badge>
    );
  if (t.includes("purchase"))
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
        Purchase
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      {typeSubtype || "—"}
    </Badge>
  );
}

function txRowBg(typeSubtype: string) {
  const t = (typeSubtype ?? "").toLowerCase().replace(/[_-]/g, " ");
  if (t.includes("credit sale")) return "bg-amber-50/60";
  if (t.includes("sale")) return "bg-emerald-50/60";
  if (t.includes("credit purchase")) return "bg-purple-50/60";
  if (t.includes("purchase")) return "bg-blue-50/60";
  return "";
}

// ── Customer Statement Modal ──────────────────────────────────────────────────

function CustomerStatementModal({
  bookId,
  customerName,
  onClose,
}: {
  bookId: string;
  customerName: string;
  onClose: () => void;
}) {
  const { data: statement, isLoading } = useGetCustomerStatement(
    bookId,
    customerName,
  );

  const { data: settlements = [] } = useSettlements(bookId);
  // Current invoice balance includes every recorded repayment and refund.
  const txWithBalance = useMemo(() => {
    if (!statement?.transactions) return [];
    const sorted = [...statement.transactions].sort(
      (a, b) => Number(a.date) - Number(b.date),
    );
    return sorted.map((tx) => {
      return {
        ...tx,
        runningBalance:
          settlements.find((s) => s.transaction.id === tx.id)?.balance ?? 0,
      };
    });
  }, [statement, settlements]);

  // Reverse for display (newest first)
  const displayTx = useMemo(
    () => [...txWithBalance].reverse(),
    [txWithBalance],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0"
        data-ocid="customers.statement.dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Account Statement — {customerName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-ocid="customers.statement.close_button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {(["a", "b", "c"] as const).map((k) => (
                  <div key={k} className="p-4 border rounded-lg">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-7 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !statement ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">
                No statement data available for {customerName}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-muted/40 border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Purchases
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {fmtNaira(statement.totalPurchases)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Payments Received
                  </p>
                  <p className="text-xl font-bold text-emerald-700">
                    {fmtNaira(statement.totalPayments)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg border ${
                    statement.currentBalance > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Balance
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      statement.currentBalance > 0
                        ? "text-destructive"
                        : "text-emerald-700"
                    }`}
                  >
                    {fmtNaira(statement.currentBalance)}
                  </p>
                  {statement.currentBalance === 0 && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully settled
                    </p>
                  )}
                </div>
              </div>

              {/* Transaction Table */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Transaction History ({displayTx.length})
                </h3>
                <ScrollArea className="flex-1 max-h-[40vh] rounded-md border">
                  {displayTx.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No transactions recorded for this customer
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2 hidden sm:table-cell">
                            Item
                          </th>
                          <th className="text-right px-3 py-2 hidden md:table-cell">
                            Qty
                          </th>
                          <th className="text-right px-3 py-2">Amount</th>
                          <th className="text-right px-3 py-2 hidden sm:table-cell">
                            Owed on invoice
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTx.map((tx, i) => (
                          <tr
                            key={tx.id || i}
                            className={`border-b last:border-0 ${txRowBg(tx.typeSubtype)}`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              {fmtDate(tx.date)}
                            </td>
                            <td className="px-3 py-2">
                              {txTypeBadge(tx.typeSubtype)}
                            </td>
                            <td className="px-3 py-2 hidden sm:table-cell max-w-[140px] truncate">
                              {tx.itemName || "—"}
                              <br />
                              <TransactionLink transaction={tx} />
                            </td>
                            <td className="px-3 py-2 text-right hidden md:table-cell">
                              {Number(tx.cartons) * Number(tx.unitsPerCarton)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {fmtNaira(tx.amount)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-semibold hidden sm:table-cell ${
                                tx.runningBalance > 0
                                  ? "text-destructive"
                                  : "text-emerald-600"
                              }`}
                            >
                              {fmtNaira(tx.runningBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </div>

              {/* Footer */}
              <p className="text-xs text-muted-foreground text-right pt-1 border-t">
                Generated on{" "}
                {new Date().toLocaleDateString("en-NG", {
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
                      <br />
                      <TransactionLink transaction={tx} />
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
  const photoInputId = useId();
  const { data: photo = "" } = useQuery({
    queryKey: ["customerPhoto", customer.bookId, customer.name],
    queryFn: () => actor!.getCustomerPhoto(customer.bookId, customer.name),
    enabled: !!actor,
  });
  const savePhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!actor) throw new Error("Connection unavailable");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 200_000
      ) {
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
            {photo && (
              <img
                src={photo}
                alt={`${customer.name}'s profile`}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
            )}
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
          <DebtPayments bookId={customer.bookId} customerName={customer.name} />
          {isAdmin && (
            <div className="block pt-4 text-sm">
              <label htmlFor={photoInputId}>
                Customer photo (JPEG, PNG or WebP, maximum 200 KB)
              </label>
              <Input
                id={photoInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={savePhoto.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) savePhoto.mutate(file);
                  event.target.value = "";
                }}
              />
              {savePhoto.isPending && (
                <output htmlFor={photoInputId}>Saving photo…</output>
              )}
            </div>
          )}
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

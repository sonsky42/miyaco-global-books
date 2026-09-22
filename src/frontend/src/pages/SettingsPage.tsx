import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  ClipboardList,
  DollarSign,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AuditLogEntry } from "../backend";
import BookMembersManager from "../components/BookMembersManager";
import JoinRequestsPanel from "../components/JoinRequestsPanel";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteBook,
  useGetAuditLog,
  useGetBookSettings,
  useGetSystemSettings,
  useGetUserBooks,
  useUpdateBookSettings,
  useUpdateSystemSettings,
} from "../hooks/useQueries";

interface SettingsPageProps {
  bookId: string;
}

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  CREATE: {
    label: "CREATE",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  UPDATE: {
    label: "UPDATE",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  APPROVE: {
    label: "APPROVE",
    className: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  },
  REJECT: {
    label: "REJECT",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  DELETE: {
    label: "DELETE",
    className: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
};

function getActionBadge(action: string) {
  const key = action.toUpperCase().split("_")[0];
  return (
    ACTION_BADGE[key] ?? {
      label: action,
      className: "bg-muted text-muted-foreground border-border",
    }
  );
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

const DATE_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "All time", value: "all" },
];

function AuditLogTab({ bookId }: { bookId: string }) {
  const { data: entries = [], isLoading } = useGetAuditLog(bookId);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [visibleCount, setVisibleCount] = useState(100);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateRange === "all" ? 0 : now - Number(dateRange) * 24 * 60 * 60 * 1000;

    return [...entries]
      .sort((a, b) => Number(b.timestamp - a.timestamp))
      .filter((e) => {
        const ms = Number(e.timestamp / BigInt(1_000_000));
        if (ms < cutoff) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          e.actorName.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.targetType.toLowerCase().includes(q)
        );
      });
  }, [entries, search, dateRange]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Audit Log
        </CardTitle>
        <CardDescription>
          A read-only trail of all changes made in this accounting book. Visible
          only to the permanent admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              data-ocid="audit.search_input"
              className="pl-9"
              placeholder="Search by actor, action, or details…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={dateRange}
            onValueChange={(v) => {
              setDateRange(v);
              setVisibleCount(100);
            }}
          >
            <SelectTrigger
              data-ocid="audit.date_range.select"
              className="w-40 shrink-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="audit.empty_state"
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-semibold text-foreground">
              No activity recorded yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Actions like adding transactions, changing roles, and approving
              records will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        Date / Time
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        Who
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        Action
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        What
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry: AuditLogEntry, idx: number) => {
                      const badge = getActionBadge(entry.action);
                      return (
                        <tr
                          key={entry.id}
                          data-ocid={`audit.item.${idx + 1}`}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td
                            className="px-4 py-3 font-medium whitespace-nowrap max-w-[140px] truncate"
                            title={entry.actorName}
                          >
                            {entry.actorName || "System"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs capitalize"
                            >
                              {entry.targetType || "—"}
                            </Badge>
                          </td>
                          <td
                            className="px-4 py-3 text-muted-foreground max-w-xs truncate"
                            title={entry.details}
                          >
                            {entry.details || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {filtered.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <Button
                  data-ocid="audit.load_more_button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 100)}
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">
              Showing {visible.length} of {filtered.length} entries
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BookSettingsTab({ bookId }: { bookId: string }) {
  const { data: bookSettings } = useGetBookSettings(bookId);
  const updateBookSettings = useUpdateBookSettings();

  const [baseCurrency, setBaseCurrency] = useState("NGN");
  const [exchangeRate, setExchangeRate] = useState("1600");
  const [hideCostPrices, setHideCostPrices] = useState(false);
  const [summaryFrequency, setSummaryFrequency] = useState("Weekly");

  useEffect(() => {
    if (bookSettings) {
      setBaseCurrency(bookSettings.baseCurrency || "NGN");
      setExchangeRate(bookSettings.exchangeRate.toString());
      setHideCostPrices(bookSettings.hideCostPricesFromNonAdmins);
      setSummaryFrequency(bookSettings.scheduledSummaryFrequency || "Weekly");
    }
  }, [bookSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateBookSettings.mutateAsync({
        bookId,
        settings: {
          bookId,
          baseCurrency,
          exchangeRate: Number.parseFloat(exchangeRate) || 1600,
          hideCostPricesFromNonAdmins: hideCostPrices,
          scheduledSummaryFrequency: summaryFrequency,
          lastSummaryDate: bookSettings?.lastSummaryDate ?? BigInt(0),
        },
      });
      if (result.__kind__ === "ok") {
        toast.success("Book settings saved successfully!");
      } else {
        toast.error(result.err || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save book settings");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Currency Settings
          </CardTitle>
          <CardDescription>
            Configure currency defaults and exchange rates for this book
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Currency */}
          <div className="space-y-2">
            <Label htmlFor="baseCurrency">Base Currency</Label>
            <p className="text-xs text-muted-foreground">
              All new transactions will default to this currency
            </p>
            <div className="flex gap-3 mt-2">
              {[
                { value: "NGN", label: "₦ NGN — Nigerian Naira" },
                { value: "USD", label: "$ USD — US Dollar" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-ocid={`book_settings.currency_${opt.value.toLowerCase()}.toggle`}
                  onClick={() => setBaseCurrency(opt.value)}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    baseCurrency === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="space-y-2">
            <Label htmlFor="exchangeRate">Exchange Rate (₦ per $1 USD)</Label>
            <p className="text-xs text-muted-foreground">
              Used to convert USD transactions to NGN for reports
            </p>
            <Input
              id="exchangeRate"
              data-ocid="book_settings.exchange_rate.input"
              type="number"
              min="1"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Staff Visibility Controls
          </CardTitle>
          <CardDescription>Manage what non-admin staff can see</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Hide Cost Prices from Non-Admin Staff
              </p>
              <p className="text-xs text-muted-foreground">
                When enabled, sales staff will see "—" instead of cost prices in
                inventory and transactions
              </p>
            </div>
            <Switch
              data-ocid="book_settings.hide_cost_prices.switch"
              checked={hideCostPrices}
              onCheckedChange={setHideCostPrices}
              className="shrink-0 mt-0.5"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Automated Reports
          </CardTitle>
          <CardDescription>
            Configure how often summaries are auto-generated for your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="summaryFrequency">Automated Summary Reports</Label>
            <p className="text-xs text-muted-foreground">
              How often to auto-generate business summaries on your dashboard
            </p>
            <Select
              value={summaryFrequency}
              onValueChange={setSummaryFrequency}
            >
              <SelectTrigger
                id="summaryFrequency"
                data-ocid="book_settings.summary_frequency.select"
                className="mt-2"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          data-ocid="book_settings.save_button"
          disabled={updateBookSettings.isPending}
          className="min-w-32"
        >
          {updateBookSettings.isPending ? "Saving…" : "Save Book Settings"}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage({ bookId }: SettingsPageProps) {
  const { data: settings, isLoading } = useGetSystemSettings();
  const { data: userBooks = [] } = useGetUserBooks();
  const { identity } = useInternetIdentity();
  const updateSettings = useUpdateSystemSettings();
  const deleteBook = useDeleteBook();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    exchangeRate: "",
    companyInfo: "",
    taxRate: "",
    currencyRounding: "",
    multiStore: false,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const currentBook = userBooks.find((book) => book.id === bookId);
  const isPermanentAdmin =
    currentBook &&
    identity &&
    currentBook.admin.toString() === identity.getPrincipal().toString();
  const isAdmin =
    currentBook &&
    identity &&
    currentBook.adminMembers.some(
      (admin) => admin.toString() === identity.getPrincipal().toString(),
    );

  useEffect(() => {
    if (settings) {
      setFormData({
        exchangeRate: settings.exchangeRate.toString(),
        companyInfo: settings.companyInfo,
        taxRate: settings.taxRate.toString(),
        currencyRounding: settings.currencyRounding.toString(),
        multiStore: settings.multiStore,
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        exchangeRate: Number.parseFloat(formData.exchangeRate),
        companyInfo: formData.companyInfo,
        taxRate: Number.parseFloat(formData.taxRate),
        currencyRounding: BigInt(formData.currencyRounding),
        multiStore: formData.multiStore,
      });
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleDeleteBook = async () => {
    if (!currentBook) return;
    if (deleteConfirmText !== currentBook.name) {
      toast.error(
        "Book name does not match. Please type the exact book name to confirm.",
      );
      return;
    }
    try {
      const result = await deleteBook.mutateAsync(bookId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
        setDeleteDialogOpen(false);
        setDeleteConfirmText("");
        queryClient.clear();
        window.location.reload();
      } else {
        toast.error(result.err);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete book";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your application preferences and manage book access
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger
              value="general"
              className="gap-2"
              data-ocid="settings.general.tab"
            >
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger
                  value="book-settings"
                  className="gap-2"
                  data-ocid="settings.book_settings.tab"
                >
                  <BookOpen className="h-4 w-4" />
                  Book Settings
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="gap-2"
                  data-ocid="settings.join_requests.tab"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Requests
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="gap-2"
                  data-ocid="settings.members.tab"
                >
                  <Users className="h-4 w-4" />
                  Book Members
                </TabsTrigger>
                {isPermanentAdmin && (
                  <TabsTrigger
                    value="audit"
                    className="gap-2"
                    data-ocid="settings.audit_log.tab"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Audit Log
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="danger"
                  className="gap-2"
                  data-ocid="settings.danger_zone.tab"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Update your company details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyInfo">Company Information</Label>
                    <Textarea
                      id="companyInfo"
                      data-ocid="general.company_info.textarea"
                      value={formData.companyInfo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyInfo: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Enter company name, address, and other details"
                    />
                  </div>
                  <Button
                    type="submit"
                    data-ocid="general.save_company_info.button"
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending
                      ? "Saving..."
                      : "Save Company Info"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Settings
                </CardTitle>
                <CardDescription>
                  Configure exchange rates and tax settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exchangeRate">
                        Exchange Rate (USD to NGN)
                      </Label>
                      <Input
                        id="exchangeRate"
                        data-ocid="general.exchange_rate.input"
                        type="number"
                        step="0.01"
                        value={formData.exchangeRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            exchangeRate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        data-ocid="general.tax_rate.input"
                        type="number"
                        step="0.01"
                        value={formData.taxRate}
                        onChange={(e) =>
                          setFormData({ ...formData, taxRate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currencyRounding">
                        Currency Rounding (Decimal Places)
                      </Label>
                      <Input
                        id="currencyRounding"
                        data-ocid="general.currency_rounding.input"
                        type="number"
                        value={formData.currencyRounding}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currencyRounding: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="multiStore">Multi-Store Support</Label>
                        <Switch
                          id="multiStore"
                          data-ocid="general.multi_store.switch"
                          checked={formData.multiStore}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, multiStore: checked })
                          }
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable support for multiple store locations
                      </p>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    data-ocid="general.save_financial.button"
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending
                      ? "Saving..."
                      : "Save Financial Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {isPermanentAdmin && (
            <>
              {/* Book Settings Tab */}
              <TabsContent value="book-settings" className="mt-6">
                <BookSettingsTab bookId={bookId} />
              </TabsContent>

              {/* Join Requests Tab */}
              <TabsContent value="requests" className="space-y-6 mt-6">
                <JoinRequestsPanel />
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-6 mt-6">
                {currentBook && <BookMembersManager book={currentBook} />}
              </TabsContent>

              {/* Audit Log Tab — permanent admin only */}
              <TabsContent value="audit" className="mt-6">
                <AuditLogTab bookId={bookId} />
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger" className="space-y-6 mt-6">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Delete Accounting Book
                    </CardTitle>
                    <CardDescription>
                      Permanently delete this accounting book and remove all
                      members. This action cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <h4 className="font-semibold text-destructive mb-2">
                          Warning: This action is irreversible
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• All members will be removed from this book</li>
                          <li>• All book data will be permanently deleted</li>
                          <li>• This action cannot be undone</li>
                        </ul>
                      </div>
                      <Button
                        variant="destructive"
                        data-ocid="danger.delete_book.open_modal_button"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
          {isAdmin && !isPermanentAdmin && (
            <>
              {/* Book Settings Tab — any admin */}
              <TabsContent value="book-settings" className="mt-6">
                <BookSettingsTab bookId={bookId} />
              </TabsContent>

              {/* Join Requests Tab — any admin */}
              <TabsContent value="requests" className="space-y-6 mt-6">
                <JoinRequestsPanel />
              </TabsContent>

              {/* Members Tab — any admin */}
              <TabsContent value="members" className="space-y-6 mt-6">
                {currentBook && <BookMembersManager book={currentBook} />}
              </TabsContent>

              {/* Danger Zone Tab — any admin (can only remove themselves) */}
              <TabsContent value="danger" className="space-y-6 mt-6">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Leave Accounting Book
                    </CardTitle>
                    <CardDescription>
                      Remove yourself from this accounting book. You can rejoin
                      by sending a new join request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">
                          Only the permanent admin (book creator) can delete the
                          book entirely. As an admin, you can leave this book.
                          You will lose access immediately and need to request
                          to rejoin.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        data-ocid="danger.leave_book.open_modal_button"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Leave Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="danger.delete_book.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Accounting Book
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete{" "}
              <strong>{currentBook?.name}</strong> and remove all{" "}
              {currentBook?.members.length} member
              {currentBook?.members.length !== 1 ? "s" : ""}.
              <br />
              <br />
              To confirm, please type the book name:{" "}
              <strong>{currentBook?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              data-ocid="danger.delete_book_confirm.input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type book name to confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="danger.delete_book.cancel_button"
              disabled={deleteBook.isPending}
              onClick={() => setDeleteConfirmText("")}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="danger.delete_book.confirm_button"
              onClick={handleDeleteBook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deleteBook.isPending || deleteConfirmText !== currentBook?.name
              }
            >
              {deleteBook.isPending ? "Deleting..." : "Delete Book Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

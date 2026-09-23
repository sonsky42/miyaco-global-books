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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Fuse from "fuse.js";
import {
  CalendarIcon,
  DollarSign,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Customer, InventoryItem, Transaction } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddTransaction,
  useDeleteTransaction,
  useGetBookSettings,
  useGetCustomerNames,
  useGetCustomers,
  useGetInventory,
  useGetInventoryItemNames,
  useGetTransactionStatistics,
  useGetTransactionsByType,
  useIsCallerAdmin,
} from "../hooks/useQueries";

interface TransactionsPageProps {
  bookId: string;
}

// ─────────────── Currency Toggle ───────────────

interface CurrencyToggleProps {
  value: string;
  onChange: (currency: string) => void;
}

function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <fieldset
      className="inline-flex rounded-md border border-border overflow-hidden"
      aria-label="Currency"
      data-ocid="transactions.currency.toggle"
    >
      <button
        type="button"
        onClick={() => onChange("NGN")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium transition-colors",
          value === "NGN"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-muted",
        )}
        data-ocid="transactions.currency.ngn"
      >
        ₦ NGN
      </button>
      <button
        type="button"
        onClick={() => onChange("USD")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium transition-colors border-l border-border",
          value === "USD"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-muted",
        )}
        data-ocid="transactions.currency.usd"
      >
        $ USD
      </button>
    </fieldset>
  );
}

// ─────────────── Customer Autocomplete ───────────────

interface AutocompleteProps {
  bookId: string;
  value: string;
  onChange: (name: string) => void;
  onSelectProfile: (customer: Customer | null) => void;
}

function CustomerAutocomplete({
  bookId,
  value,
  onChange,
  onSelectProfile,
}: AutocompleteProps) {
  const { data: customerNames = [] } = useGetCustomerNames(bookId);
  const { data: customers = [] } = useGetCustomers(bookId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () => new Fuse(customerNames, { threshold: 0.4, includeScore: true }),
    [customerNames],
  );

  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 1) return [];
    return fuse
      .search(value)
      .slice(0, 7)
      .map((r) => r.item);
  }, [value, fuse]);

  const isNew =
    value.trim().length > 0 && !customerNames.includes(value.trim());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    const profile = customers.find((c) => c.name === name) ?? null;
    onSelectProfile(profile);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onSelectProfile(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type customer name…"
        autoComplete="off"
        data-ocid="transactions.customer_name.input"
      />
      {isNew && value.trim() && (
        <div className="flex items-center gap-1 mt-1">
          <UserPlus className="h-3 w-3 text-blue-500" />
          <span className="text-xs text-blue-600">
            New customer — profile will be created on approval
          </span>
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(name);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────── Transaction Card ───────────────

function TransactionCard({
  transaction,
  onDelete,
  showCostPrice,
}: {
  transaction: Transaction;
  onDelete: () => void;
  showCostPrice: boolean;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const currencySymbol = transaction.currency === "USD" ? "$" : "₦";

  return (
    <>
      <div
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        data-ocid="transactions.transaction.card"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold truncate">{transaction.customerName}</p>
            {transaction.phone && (
              <span className="text-xs text-muted-foreground">
                • {transaction.phone}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {transaction.brand && <span>{transaction.brand}</span>}
            {transaction.brand && <span>•</span>}
            <span>{transaction.itemName}</span>
            <span>•</span>
            <span>
              {Number(transaction.cartons)} cartons ×{" "}
              {Number(transaction.unitsPerCarton)} units
            </span>
            {transaction.productType && (
              <>
                <span>•</span>
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {transaction.productType}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{transaction.paymentMethod}</span>
            <span>•</span>
            <span>
              {Number(transaction.date) > 0
                ? new Date(
                    Number(transaction.date) / 1_000_000,
                  ).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            {/* Cost price — hidden when role-based setting restricts it */}
            {transaction.costPriceAtSale > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Cost:{" "}
                  {showCostPrice ? (
                    <span>
                      {currencySymbol}
                      {Number(transaction.costPriceAtSale).toLocaleString()}
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-0.5 text-muted-foreground/60"
                      title="Cost price hidden by admin"
                    >
                      <EyeOff className="h-3 w-3" />—
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
          {transaction.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {transaction.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold">
              {currencySymbol}
              {Number(transaction.amount).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {transaction.paymentMethod}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete transaction"
            data-ocid="transactions.delete_button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="transactions.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone and will update all statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="transactions.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="transactions.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────── Transaction Form ───────────────

// ─────────────── Item Autocomplete ───────────────

interface ItemAutocompleteProps {
  bookId: string;
  value: string;
  onChange: (name: string) => void;
  onSelectItem: (item: InventoryItem | null) => void;
}

function ItemAutocomplete({
  bookId,
  value,
  onChange,
  onSelectItem,
}: ItemAutocompleteProps) {
  const { data: itemNames = [] } = useGetInventoryItemNames(bookId);
  const { data: inventoryItems = [] } = useGetInventory(bookId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () => new Fuse(itemNames, { threshold: 0.4, includeScore: true }),
    [itemNames],
  );

  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 1) return [];
    return fuse
      .search(value)
      .slice(0, 7)
      .map((r) => r.item);
  }, [value, fuse]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    const item = inventoryItems.find((i) => i.name === name) ?? null;
    onSelectItem(item);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          onSelectItem(inventoryItems.find((item) => item.name.toLowerCase() === e.target.value.trim().toLowerCase()) ?? null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type item name…"
        autoComplete="off"
        data-ocid="transactions.item_name.input"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(name);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────── Transaction Form ───────────────

function TransactionForm({
  bookId,
  transactionType,
  onSuccess,
  defaultCurrency,
  exchangeRate,
}: {
  bookId: string;
  transactionType: "Sales" | "Credit Sales" | "Purchases" | "Credit Purchases";
  onSuccess: () => void;
  defaultCurrency: string;
  exchangeRate: number;
}) {
  const addTransaction = useAddTransaction();
  const { identity } = useInternetIdentity();
  const [date, setDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueDateCalOpen, setDueDateCalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Customer | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    brand: "",
    productType: "",
    itemName: "",
    cartons: "",
    unitsPerCarton: "",
    pricePerCarton: "",
    currency: defaultCurrency || "NGN",
    paymentMethod: transactionType.includes("Credit") ? "credit" : "cash",
    notes: "",
    dueDate: "",
  });

  // When defaultCurrency changes (settings load), update form default
  const [currencyInitialized, setCurrencyInitialized] = useState(false);
  useEffect(() => {
    if (!currencyInitialized && defaultCurrency) {
      setFormData((prev) => ({ ...prev, currency: defaultCurrency }));
      setCurrencyInitialized(true);
    }
  }, [defaultCurrency, currencyInitialized]);

  const handleSelectProfile = (profile: Customer | null) => {
    setSelectedProfile(profile);
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email,
        brand: profile.brand || prev.brand,
      }));
    }
  };

  const handleSelectItem = (item: InventoryItem | null) => {
    setSelectedItem(item);
    if (item) {
      setFormData((prev) => ({
        ...prev,
        unitsPerCarton: item.unitsPerCarton.toString(),
      }));
    }
  };

  const set = (key: string, val: string) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  // Derived values
  const cartonsNum = Number.parseInt(formData.cartons || "0", 10);
  const unitsPerCartonNum = Number.parseInt(formData.unitsPerCarton || "0", 10);
  const totalUnits = cartonsNum * unitsPerCartonNum;
  const pricePerCartonNum = Number.parseFloat(formData.pricePerCarton || "0");
  const totalValue = cartonsNum * pricePerCartonNum;

  // NGN equivalent when USD is selected
  const ngnEquivalent =
    formData.currency === "USD" && totalValue > 0 && exchangeRate > 0
      ? totalValue * exchangeRate
      : null;

  // Stock validation for sales / credit sales
  const isSaleType =
    transactionType === "Sales" || transactionType === "Credit Sales";
  const availableCartons = selectedItem
    ? Math.floor(Number(selectedItem.quantity) / Math.max(1, unitsPerCartonNum))
    : 0;
  const stockError =
    isSaleType && cartonsNum > 0 && cartonsNum > availableCartons
      ? `Only ${availableCartons} cartons available`
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) {
      toast.error("You must be logged in to add transactions");
      return;
    }
    if (stockError) {
      toast.error(stockError);
      return;
    }

    const costPriceAtSale = selectedItem ? Number(selectedItem.costPrice) : 0;

    const transaction: Transaction = {
      id: `tx-${crypto.randomUUID()}`,
      date: BigInt(date.getTime() * 1_000_000),
      customerName: formData.customerName,
      phone: formData.phone,
      email: formData.email,
      brand: formData.brand,
      productType: formData.productType,
      typeSubtype: transactionType,
      itemName: formData.itemName,
      cartons: BigInt(formData.cartons || "0"),
      unitsPerCarton: BigInt(formData.unitsPerCarton || "0"),
      pricePerCarton: Number.parseFloat(formData.pricePerCarton || "0"),
      amount: totalValue,
      sellingPriceAtSale: pricePerCartonNum,
      costPriceAtSale,
      currency: formData.currency,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      bookId,
      createdBy: identity.getPrincipal(),
      approved: false,
      approvalProcessed: false,
    };

    try {
      const result = await addTransaction.mutateAsync(transaction);
      if (result.__kind__ === "ok") {
        toast.success(result.ok || "Transaction submitted for approval");
      } else {
        toast.error(result.err);
        return;
      }
      onSuccess();
      setFormData({
        customerName: "",
        phone: "",
        email: "",
        brand: "",
        productType: "",
        itemName: "",
        cartons: "",
        unitsPerCarton: "",
        pricePerCarton: "",
        currency: defaultCurrency || "NGN",
        paymentMethod: transactionType.includes("Credit") ? "credit" : "cash",
        notes: "",
        dueDate: "",
      });
      setSelectedProfile(null);
      setSelectedItem(null);
      setDate(new Date());
      setCurrencyInitialized(false);
    } catch (err) {
      console.error("Error adding transaction:", err);
      toast.error("Failed to add transaction");
    }
  };

  const priceLabel =
    formData.currency === "USD"
      ? "Price per Carton $ *"
      : "Price per Carton ₦ *";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date Picker — calendar only, no manual input */}
      <div className="space-y-2">
        <Label>Transaction Date *</Label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
              data-ocid="transactions.date.toggle"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  setCalOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Customer Name with Autocomplete */}
      <div className="space-y-2">
        <Label>Customer Name *</Label>
        <CustomerAutocomplete
          bookId={bookId}
          value={formData.customerName}
          onChange={(val) => set("customerName", val)}
          onSelectProfile={handleSelectProfile}
        />
        {selectedProfile && (
          <p className="text-xs text-emerald-600">
            ✓ Returning customer — {selectedProfile.transactionCount.toString()}{" "}
            previous transactions
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => set("phone", e.target.value)}
            data-ocid="transactions.phone.input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => set("email", e.target.value)}
            data-ocid="transactions.email.input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => set("brand", e.target.value)}
            data-ocid="transactions.brand.input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productType">Product Type</Label>
          <Input
            id="productType"
            value={formData.productType}
            onChange={(e) => set("productType", e.target.value)}
            placeholder="e.g. Electronics, Food…"
            data-ocid="transactions.product_type.input"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="itemName">Item Name *</Label>
          <ItemAutocomplete
            bookId={bookId}
            value={formData.itemName}
            onChange={(val) => set("itemName", val)}
            onSelectItem={handleSelectItem}
          />
          {selectedItem && isSaleType && (
            <p className="text-xs text-muted-foreground">
              Cost price: ₦{Number(selectedItem.costPrice).toLocaleString()}
              /unit · In stock: {Number(selectedItem.quantity)} cartons
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cartons">Cartons *</Label>
          <Input
            id="cartons"
            type="number"
            min="1"
            value={formData.cartons}
            onChange={(e) => set("cartons", e.target.value)}
            required
            data-ocid="transactions.cartons.input"
          />
          {stockError && (
            <p className="text-xs text-destructive">{stockError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitsPerCarton">Units per Carton *</Label>
          <Input
            id="unitsPerCarton"
            type="number"
            min="1"
            value={formData.unitsPerCarton}
            onChange={(e) => set("unitsPerCarton", e.target.value)}
            required
            data-ocid="transactions.units_per_carton.input"
          />
        </div>
        {totalUnits > 0 && (
          <div className="col-span-2 text-sm text-muted-foreground">
            Total units: <strong>{totalUnits.toLocaleString()}</strong>
          </div>
        )}

        {/* Currency toggle — compact button-group, spans full width */}
        <div className="space-y-2 col-span-2">
          <Label>Currency *</Label>
          <CurrencyToggle
            value={formData.currency}
            onChange={(v) => set("currency", v)}
          />
        </div>

        {/* Price per Carton field with live total value */}
        <div className="space-y-2 col-span-2">
          <Label htmlFor="pricePerCarton">{priceLabel}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm pointer-events-none">
              {formData.currency === "USD" ? "$" : "₦"}
            </span>
            <Input
              id="pricePerCarton"
              type="number"
              step="0.01"
              min="0"
              value={formData.pricePerCarton}
              onChange={(e) => set("pricePerCarton", e.target.value)}
              required
              className="pl-7"
              data-ocid="transactions.price_per_carton.input"
            />
          </div>
          {totalValue > 0 && (
            <p className="text-sm font-medium text-emerald-600">
              Total value: {formData.currency === "USD" ? "$" : "₦"}
              {totalValue.toLocaleString("en-NG", { maximumFractionDigits: 2 })}
            </p>
          )}
          {/* USD → NGN conversion helper */}
          {ngnEquivalent !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-blue-500 font-medium">≈</span>
              <span>
                ₦
                {ngnEquivalent.toLocaleString("en-NG", {
                  maximumFractionDigits: 0,
                })}
              </span>
              <span className="opacity-60">
                (at ₦{exchangeRate.toLocaleString()}/$ rate)
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="paymentMethod">Payment Method *</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(v) => set("paymentMethod", v)}
          >
            <SelectTrigger data-ocid="transactions.payment_method.select">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due date for credit types */}
      {transactionType.includes("Credit") && (
        <div className="space-y-2">
          <Label>Due / Payback Date</Label>
          <Popover open={dueDateCalOpen} onOpenChange={setDueDateCalOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground",
                )}
                data-ocid="transactions.due_date.toggle"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(d) => {
                  setDueDate(d);
                  if (d) {
                    set("dueDate", d.toISOString().split("T")[0]);
                    setDueDateCalOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          data-ocid="transactions.notes.textarea"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={addTransaction.isPending || !!stockError}
        data-ocid="transactions.submit_button"
      >
        {addTransaction.isPending
          ? "Submitting…"
          : `Add ${transactionType} Transaction`}
      </Button>
    </form>
  );
}

// ─────────────── Tab Panel ───────────────

type TxType = "Sales" | "Credit Sales" | "Purchases" | "Credit Purchases";

const TAB_META: Record<
  string,
  { label: string; icon: React.ReactNode; addLabel: string; type: TxType }
> = {
  sales: {
    label: "Sales",
    icon: <TrendingUp className="h-4 w-4" />,
    addLabel: "Add Sale",
    type: "Sales",
  },
  "credit-sales": {
    label: "Credit Sales",
    icon: <DollarSign className="h-4 w-4" />,
    addLabel: "Add Credit Sale",
    type: "Credit Sales",
  },
  purchases: {
    label: "Purchases",
    icon: <TrendingDown className="h-4 w-4" />,
    addLabel: "Add Purchase",
    type: "Purchases",
  },
  "credit-purchases": {
    label: "Credit Purchases",
    icon: <TrendingDown className="h-4 w-4" />,
    addLabel: "Add Credit Purchase",
    type: "Credit Purchases",
  },
};

function TxTabContent({
  tabKey,
  transactions,
  onDelete,
  onAdd,
  showCostPrice,
}: {
  tabKey: string;
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onAdd: () => void;
  showCostPrice: boolean;
}) {
  const meta = TAB_META[tabKey];
  if (!meta) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {meta.icon}
              {meta.label} Transactions
            </CardTitle>
            <CardDescription>
              {transactions.length} record{transactions.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={onAdd}
            className="gap-2"
            data-ocid={`transactions.${tabKey}.add_button`}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{meta.addLabel}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div
            className="text-center py-12"
            data-ocid={`transactions.${tabKey}.empty_state`}
          >
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              No {meta.label.toLowerCase()} transactions yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "{meta.addLabel}" to record your first one.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-ocid={`transactions.${tabKey}.list`}>
            {transactions
              .slice()
              .sort((a, b) => Number(b.date) - Number(a.date))
              .map((tx, idx) => (
                <div
                  key={tx.id}
                  data-ocid={`transactions.${tabKey}.item.${idx + 1}`}
                >
                  <TransactionCard
                    transaction={tx}
                    onDelete={() => onDelete(tx.id)}
                    showCostPrice={showCostPrice}
                  />
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────── Main Page ───────────────

export default function TransactionsPage({ bookId }: TransactionsPageProps) {
  const [activeTab, setActiveTab] = useState("sales");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<TxType>("Sales");

  const { data: salesTxs = [], isLoading: salesLoading } =
    useGetTransactionsByType(bookId, "Sales");
  const { data: creditSalesTxs = [], isLoading: creditSalesLoading } =
    useGetTransactionsByType(bookId, "Credit Sales");
  const { data: purchasesTxs = [], isLoading: purchasesLoading } =
    useGetTransactionsByType(bookId, "Purchases");
  const { data: creditPurchasesTxs = [], isLoading: creditPurchasesLoading } =
    useGetTransactionsByType(bookId, "Credit Purchases");
  const { data: statistics } = useGetTransactionStatistics(bookId);
  const { data: bookSettings } = useGetBookSettings(bookId);
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: _inventoryItems = [] } = useGetInventory(bookId);
  const deleteTransaction = useDeleteTransaction();

  // Derived settings
  const baseCurrency = bookSettings?.baseCurrency ?? "NGN";
  const exchangeRate = bookSettings?.exchangeRate ?? 1;
  // Show cost price if: admin always sees it; non-admin sees it unless hidden
  const showCostPrice =
    isAdmin || !(bookSettings?.hideCostPricesFromNonAdmins ?? false);

  const handleDelete = async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync({ transactionId, bookId });
      toast.success("Transaction deleted. All stats updated.");
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error("Failed to delete transaction");
    }
  };

  const handleOpenDialog = (type: TxType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const isLoading =
    salesLoading ||
    creditSalesLoading ||
    purchasesLoading ||
    creditPurchasesLoading;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="transactions.loading_state"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const currencyDisplay = baseCurrency === "USD" ? "$" : "₦";

  return (
    <div className="space-y-6" data-ocid="transactions.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transactions</h1>
          <p className="text-muted-foreground">
            Record and manage sales, credit sales, purchases, and credit
            purchases
          </p>
        </div>
        {/* Currency / Rate indicator */}
        {bookSettings && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span>
              Base: <strong>{baseCurrency}</strong>
            </span>
            {exchangeRate > 1 && (
              <span className="text-muted-foreground/70">
                · ₦{exchangeRate.toLocaleString()}/$
              </span>
            )}
            {!showCostPrice && (
              <span className="flex items-center gap-1 text-amber-600">
                <EyeOff className="h-3 w-3" />
                Costs hidden
              </span>
            )}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-ocid="transactions.stats.sales">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {currencyDisplay}
                {statistics.sales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {salesTxs.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card data-ocid="transactions.stats.credit-sales">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Credit Sales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {currencyDisplay}
                {statistics.creditSales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {creditSalesTxs.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card data-ocid="transactions.stats.purchases">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchases</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {currencyDisplay}
                {statistics.purchases.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {purchasesTxs.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card data-ocid="transactions.stats.credit-purchases">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Credit Purchases
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {currencyDisplay}
                {statistics.creditPurchases.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {creditPurchasesTxs.length} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="grid w-full grid-cols-2 md:grid-cols-4 h-auto"
          data-ocid="transactions.tab"
        >
          <TabsTrigger
            value="sales"
            className="text-xs sm:text-sm py-2"
            data-ocid="transactions.sales.tab"
          >
            Sales ({salesTxs.length})
          </TabsTrigger>
          <TabsTrigger
            value="credit-sales"
            className="text-xs sm:text-sm py-2"
            data-ocid="transactions.credit-sales.tab"
          >
            Credit Sales ({creditSalesTxs.length})
          </TabsTrigger>
          <TabsTrigger
            value="purchases"
            className="text-xs sm:text-sm py-2"
            data-ocid="transactions.purchases.tab"
          >
            Purchases ({purchasesTxs.length})
          </TabsTrigger>
          <TabsTrigger
            value="credit-purchases"
            className="text-xs sm:text-sm py-2"
            data-ocid="transactions.credit-purchases.tab"
          >
            Credit Purchases ({creditPurchasesTxs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <TxTabContent
            tabKey="sales"
            transactions={salesTxs}
            onDelete={handleDelete}
            onAdd={() => handleOpenDialog("Sales")}
            showCostPrice={showCostPrice}
          />
        </TabsContent>
        <TabsContent value="credit-sales" className="mt-6">
          <TxTabContent
            tabKey="credit-sales"
            transactions={creditSalesTxs}
            onDelete={handleDelete}
            onAdd={() => handleOpenDialog("Credit Sales")}
            showCostPrice={showCostPrice}
          />
        </TabsContent>
        <TabsContent value="purchases" className="mt-6">
          <TxTabContent
            tabKey="purchases"
            transactions={purchasesTxs}
            onDelete={handleDelete}
            onAdd={() => handleOpenDialog("Purchases")}
            showCostPrice={showCostPrice}
          />
        </TabsContent>
        <TabsContent value="credit-purchases" className="mt-6">
          <TxTabContent
            tabKey="credit-purchases"
            transactions={creditPurchasesTxs}
            onDelete={handleDelete}
            onAdd={() => handleOpenDialog("Credit Purchases")}
            showCostPrice={showCostPrice}
          />
        </TabsContent>
      </Tabs>

      {/* Transaction Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="transactions.add.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add {dialogType} Transaction</DialogTitle>
            <DialogDescription>
              Enter transaction details. Customer name will be auto-saved to
              your customer database.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            bookId={bookId}
            transactionType={dialogType}
            onSuccess={() => setDialogOpen(false)}
            defaultCurrency={baseCurrency}
            exchangeRate={exchangeRate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

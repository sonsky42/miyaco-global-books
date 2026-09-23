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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Fuse from "fuse.js";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { InventoryItem, Location } from "../backend";
import {
  useAddInventoryItem,
  useCreateLocation,
  useDeleteLocation,
  useDismissDraftPurchaseOrder,
  useGetBookSettings,
  useGetDraftPurchaseOrders,
  useGetInventory,
  useGetInventoryByLocation,
  useGetLocations,
  useGetLowStockAlerts,
  useTransferInventory,
} from "../hooks/useQueries";

interface InventoryPageProps {
  bookId: string;
  isAdmin: boolean;
}

// Helper: currency symbol
function currencySymbol(currency?: string | null) {
  return currency === "USD" ? "$" : "₦";
}

// ─── Total Cost Confirmation Modal ────────────────────────────────────────────
interface TotalCostConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  totalCost: number;
  itemName: string;
  symbol: string;
}

function TotalCostConfirmDialog({
  open,
  onConfirm,
  onCancel,
  totalCost,
  itemName,
  symbol,
}: TotalCostConfirmProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent
        className="max-w-sm"
        data-ocid="inventory.cost_confirm.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirm Total Cost
          </DialogTitle>
          <DialogDescription>
            Review the total purchase cost for{" "}
            <span className="font-semibold text-foreground">{itemName}</span>{" "}
            before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-primary">
            {symbol}
            {totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Cost per unit × Total units)
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            data-ocid="inventory.cost_confirm.cancel_button"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            data-ocid="inventory.cost_confirm.confirm_button"
          >
            Save Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Item Form ─────────────────────────────────────────────────────────────
interface AddItemFormData {
  name: string;
  brand: string;
  productType: string;
  supplier: string;
  quantity: string;
  unitsPerCarton: string;
  costPrice: string;
  locationId: string;
  currency: string;
}

const emptyForm: AddItemFormData = {
  name: "",
  brand: "",
  productType: "",
  supplier: "",
  quantity: "",
  unitsPerCarton: "",
  costPrice: "",
  locationId: "",
  currency: "NGN",
};

// ─── Transfer Form ────────────────────────────────────────────────────────────
interface TransferFormData {
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
  unit: string;
}

const emptyTransfer: TransferFormData = {
  itemId: "",
  fromLocationId: "",
  toLocationId: "",
  quantity: "",
  unit: "units",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage({ bookId, isAdmin }: InventoryPageProps) {
  // Query hooks
  const { data: inventory = [], isLoading } = useGetInventory(bookId);
  const { data: lowStockItems = [] } = useGetLowStockAlerts(bookId);
  const { data: locations = [] } = useGetLocations(bookId);
  const { data: draftOrders = [], isLoading: draftOrdersLoading } =
    useGetDraftPurchaseOrders(bookId);
  const { data: bookSettings } = useGetBookSettings(bookId);
  const addItem = useAddInventoryItem();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();
  const transferInventory = useTransferInventory();
  const dismissDraftOrder = useDismissDraftPurchaseOrder();

  // Currency helpers derived from book settings
  const baseCurrency = "NGN";
  const exchangeRate = bookSettings?.exchangeRate ?? 0;
  const symbol = currencySymbol(baseCurrency);
  const hideCostPrices =
    bookSettings?.hideCostPricesFromNonAdmins === true && !isAdmin;

  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [costConfirmOpen, setCostConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<AddItemFormData>({
    ...emptyForm,
    currency: baseCurrency,
  });
  const [transferData, setTransferData] =
    useState<TransferFormData>(emptyTransfer);
  const [newLocationName, setNewLocationName] = useState("");
  const [filterLocationId, setFilterLocationId] = useState<string>("all");

  // Fuse.js fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(inventory, {
        keys: ["name", "brand", "productType", "supplier"],
        threshold: 0.35,
        includeScore: true,
      }),
    [inventory],
  );

  const filteredBySearch = useMemo(() => {
    if (!searchTerm.trim()) return inventory;
    return fuse.search(searchTerm).map((r) => r.item);
  }, [searchTerm, inventory, fuse]);

  const { data: locationInventory = [] } = useGetInventoryByLocation(
    bookId,
    filterLocationId !== "all" ? filterLocationId : "",
  );

  const displayedInventory = useMemo(() => {
    const base =
      filterLocationId !== "all" ? locationInventory : filteredBySearch;
    if (filterLocationId !== "all" && searchTerm.trim()) {
      const locationFuse = new Fuse(locationInventory, {
        keys: ["name", "brand", "productType"],
        threshold: 0.35,
      });
      return locationFuse.search(searchTerm).map((r) => r.item);
    }
    return base;
  }, [filterLocationId, locationInventory, filteredBySearch, searchTerm]);

  // Calculated total cost for confirmation modal
  const totalCost = useMemo(() => {
    const qty = Number.parseFloat(formData.quantity) || 0;
    const upc = Number.parseFloat(formData.unitsPerCarton) || 1;
    const cost = Number.parseFloat(formData.costPrice) || 0;
    return cost * (qty * upc);
  }, [formData.quantity, formData.unitsPerCarton, formData.costPrice]);

  // ₦ equivalent shown when form currency is USD
  const ngnEquivalent = useMemo(() => {
    if (formData.currency !== "USD") return null;
    const cost = Number.parseFloat(formData.costPrice) || 0;
    return cost * exchangeRate;
  }, [formData.currency, formData.costPrice, exchangeRate]);

  // Only show draft orders that are still in "draft" status
  const pendingDraftOrders = useMemo(
    () => draftOrders.filter((o) => o.status === "draft"),
    [draftOrders],
  );

  const handleAddFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.costPrice) return;
    setCostConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (formData.currency === "USD" && !(exchangeRate > 0)) {
      toast.error("Set the book's NGN per USD exchange rate first");
      return;
    }
    setCostConfirmOpen(false);
    const defaultLocationId =
      formData.locationId || (locations.length > 0 ? locations[0].id : "main");

    const item: InventoryItem = {
      id: `item-${crypto.randomUUID()}`,
      name: formData.name,
      brand: formData.brand,
      productType: formData.productType,
      supplier: formData.supplier,
      quantity: BigInt(formData.quantity) * BigInt(formData.unitsPerCarton || "1"),
      unitsPerCarton: BigInt(formData.unitsPerCarton || "1"),
      costPrice: Number.parseFloat(formData.costPrice) * (formData.currency === "USD" ? exchangeRate : 1),
      sellingPrice: 0,
      variants: [],
      bookId,
      approved: false,
      locationId: defaultLocationId,
      highestEverQuantity: BigInt(formData.quantity) * BigInt(formData.unitsPerCarton || "1"),
      createdAt: BigInt(Date.now()) * BigInt(1_000_000),
    };

    try {
      const result = await addItem.mutateAsync(item);
      if (result.__kind__ === "ok") {
        toast.success(
          isAdmin
            ? "Item added to inventory."
            : "Item submitted for admin approval.",
        );
      } else {
        toast.error(result.err);
      }
      setAddDialogOpen(false);
      setFormData({ ...emptyForm, currency: baseCurrency });
    } catch {
      toast.error("Failed to add inventory item");
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !transferData.itemId ||
      !transferData.fromLocationId ||
      !transferData.toLocationId ||
      !transferData.quantity
    )
      return;

    try {
      const result = await transferInventory.mutateAsync({
        bookId,
        itemId: transferData.itemId,
        fromLocationId: transferData.fromLocationId,
        toLocationId: transferData.toLocationId,
        quantity: BigInt(transferData.quantity),
        unit: transferData.unit,
      });
      if (result.__kind__ === "ok") {
        toast.success("Inventory transferred successfully.");
      } else {
        toast.error(result.err);
      }
      setTransferDialogOpen(false);
      setTransferData(emptyTransfer);
    } catch {
      toast.error("Failed to transfer inventory");
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    try {
      const result = await createLocation.mutateAsync({
        bookId,
        name: newLocationName.trim(),
      });
      if (result.__kind__ === "ok") {
        toast.success(`Location "${newLocationName}" created.`);
        setNewLocationName("");
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Failed to create location");
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    try {
      const result = await deleteLocation.mutateAsync({
        bookId,
        locationId: loc.id,
      });
      if (result.__kind__ === "ok") {
        toast.success(`Location "${loc.name}" deleted.`);
      } else {
        toast.error(result.err);
      }
    } catch {
      toast.error("Failed to delete location");
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="inventory.loading_state"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const formSymbol = currencySymbol(formData.currency);

  return (
    <div className="space-y-6" data-ocid="inventory.page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Inventory</h1>
          <p className="text-muted-foreground">
            Manage stock across all locations in real time
            {" · NGN (₦)"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Dialog
              open={transferDialogOpen}
              onOpenChange={setTransferDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  data-ocid="inventory.transfer.open_modal_button"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-lg"
                data-ocid="inventory.transfer.dialog"
              >
                <DialogHeader>
                  <DialogTitle>Transfer Inventory</DialogTitle>
                  <DialogDescription>
                    Move stock between locations
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTransferSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-item">Item</Label>
                    <Select
                      value={transferData.itemId}
                      onValueChange={(v) =>
                        setTransferData({ ...transferData, itemId: v })
                      }
                    >
                      <SelectTrigger
                        id="transfer-item"
                        data-ocid="inventory.transfer.item.select"
                      >
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} — {item.brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-loc">From Location</Label>
                      <Select
                        value={transferData.fromLocationId}
                        onValueChange={(v) =>
                          setTransferData({
                            ...transferData,
                            fromLocationId: v,
                          })
                        }
                      >
                        <SelectTrigger
                          id="from-loc"
                          data-ocid="inventory.transfer.from.select"
                        >
                          <SelectValue placeholder="From" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="to-loc">To Location</Label>
                      <Select
                        value={transferData.toLocationId}
                        onValueChange={(v) =>
                          setTransferData({ ...transferData, toLocationId: v })
                        }
                      >
                        <SelectTrigger
                          id="to-loc"
                          data-ocid="inventory.transfer.to.select"
                        >
                          <SelectValue placeholder="To" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transfer-qty">Quantity</Label>
                      <Input
                        id="transfer-qty"
                        type="number"
                        min="1"
                        value={transferData.quantity}
                        onChange={(e) =>
                          setTransferData({
                            ...transferData,
                            quantity: e.target.value,
                          })
                        }
                        required
                        data-ocid="inventory.transfer.quantity.input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transfer-unit">Unit</Label>
                      <Select
                        value={transferData.unit}
                        onValueChange={(v) =>
                          setTransferData({ ...transferData, unit: v })
                        }
                      >
                        <SelectTrigger
                          id="transfer-unit"
                          data-ocid="inventory.transfer.unit.select"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="units">Units</SelectItem>
                          <SelectItem value="cartons">Cartons</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      type="button"
                      className="flex-1"
                      onClick={() => setTransferDialogOpen(false)}
                      data-ocid="inventory.transfer.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={transferInventory.isPending}
                      data-ocid="inventory.transfer.submit_button"
                    >
                      {transferInventory.isPending
                        ? "Transferring..."
                        : "Transfer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                data-ocid="inventory.add.open_modal_button"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-2xl"
              data-ocid="inventory.add.dialog"
            >
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>
                  {isAdmin
                    ? "Fill in product details. A purchase record will be auto-created."
                    : "Your submission will be reviewed by an admin before being added."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inv-name">Item Name *</Label>
                    <Input
                      id="inv-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      data-ocid="inventory.add.name.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-brand">Brand *</Label>
                    <Input
                      id="inv-brand"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      required
                      data-ocid="inventory.add.brand.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-product-type">Product Type *</Label>
                    <Input
                      id="inv-product-type"
                      value={formData.productType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productType: e.target.value,
                        })
                      }
                      required
                      data-ocid="inventory.add.product_type.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-supplier">Supplier</Label>
                    <Input
                      id="inv-supplier"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                      data-ocid="inventory.add.supplier.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-qty">Quantity (Cartons) *</Label>
                    <Input
                      id="inv-qty"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      required
                      data-ocid="inventory.add.quantity.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-upc">Units per Carton *</Label>
                    <Input
                      id="inv-upc"
                      type="number"
                      min="1"
                      value={formData.unitsPerCarton}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unitsPerCarton: e.target.value,
                        })
                      }
                      required
                      data-ocid="inventory.add.units_per_carton.input"
                    />
                  </div>
                  {/* Currency selector */}
                  <div className="space-y-2">
                    <Label htmlFor="inv-currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) =>
                        setFormData({ ...formData, currency: v })
                      }
                    >
                      <SelectTrigger
                        id="inv-currency"
                        data-ocid="inventory.add.currency.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Cost price with NGN equivalent helper */}
                  <div className="space-y-2">
                    <Label htmlFor="inv-cost">
                      Cost Price per Unit ({formSymbol}) *
                    </Label>
                    <Input
                      id="inv-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      required
                      data-ocid="inventory.add.cost_price.input"
                    />
                    {ngnEquivalent !== null && formData.costPrice && (
                      <p className="text-xs text-muted-foreground">
                        ≈ ₦
                        {ngnEquivalent.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        (at ₦{exchangeRate.toLocaleString()}/USD)
                      </p>
                    )}
                  </div>
                  {/* Live total cost preview */}
                  {formData.quantity &&
                    formData.unitsPerCarton &&
                    formData.costPrice && (
                      <div className="space-y-2">
                        <Label>Estimated Total Cost</Label>
                        <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/40">
                          <span className="text-sm font-semibold text-primary">
                            {formSymbol}
                            {totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  {isAdmin && locations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="inv-location">Location</Label>
                      <Select
                        value={formData.locationId}
                        onValueChange={(v) =>
                          setFormData({ ...formData, locationId: v })
                        }
                      >
                        <SelectTrigger
                          id="inv-location"
                          data-ocid="inventory.add.location.select"
                        >
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addItem.isPending}
                  data-ocid="inventory.add.submit_button"
                >
                  {addItem.isPending ? "Saving..." : "Review Total Cost & Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Total cost confirmation popup */}
      <TotalCostConfirmDialog
        open={costConfirmOpen}
        onConfirm={handleConfirmSave}
        onCancel={() => setCostConfirmOpen(false)}
        totalCost={totalCost}
        itemName={formData.name}
        symbol={formSymbol}
      />

      {/* ── Draft Purchase Orders (Reorder Alerts) ── */}
      {draftOrdersLoading ? (
        <div
          className="space-y-2"
          data-ocid="inventory.draft_orders.loading_state"
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : pendingDraftOrders.length > 0 ? (
        <Card
          className="border-orange-500/40 bg-orange-500/5"
          data-ocid="inventory.draft_orders.section"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-base">
              <ShoppingCart className="h-5 w-5" />
              Reorder Alerts — {pendingDraftOrders.length} draft purchase order
              {pendingDraftOrders.length !== 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              Stock has dropped below threshold. Review and place orders with
              your suppliers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingDraftOrders.map((order, idx) => {
                const triggeredDate = new Date(
                  Number(order.triggeredAt) / 1_000_000,
                ).toLocaleDateString();
                return (
                  <div
                    key={order.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-orange-500/25 bg-background gap-3"
                    data-ocid={`inventory.draft_orders.item.${idx + 1}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ShoppingCart className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <p className="font-semibold text-sm truncate">
                          {order.itemName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {Number(order.currentQuantity)} carton
                        {Number(order.currentQuantity) !== 1 ? "s" : ""}{" "}
                        remaining
                      </p>
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        Suggested order: {Number(order.suggestedQuantity)}{" "}
                        cartons
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Triggered {triggeredDate}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={dismissDraftOrder.isPending}
                      onClick={async () => {
                        try {
                          const res = await dismissDraftOrder.mutateAsync({
                            bookId,
                            orderId: order.id,
                          });
                          if (res.__kind__ === "ok") {
                            toast.success(
                              `Dismissed reorder alert for "${order.itemName}".`,
                            );
                          } else {
                            toast.error(res.err);
                          }
                        } catch {
                          toast.error("Failed to dismiss order");
                        }
                      }}
                      aria-label="Dismiss draft order"
                      data-ocid={`inventory.draft_orders.dismiss_button.${idx + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 ? (
        <Card
          className="border-amber-500/40 bg-amber-500/5"
          data-ocid="inventory.low_stock.section"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-base">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts — {lowStockItems.length} item
              {lowStockItems.length !== 1 ? "s" : ""} need restocking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-500/25 bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.brand} · {item.productType}
                    </p>
                  </div>
                  <Badge
                    variant="destructive"
                    className="shrink-0 ml-2 text-xs"
                  >
                    {Number(item.quantity)} cartons
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-card text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          All items well-stocked
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="items">
        <TabsList className="w-full sm:w-auto" data-ocid="inventory.tabs">
          <TabsTrigger value="items" data-ocid="inventory.items.tab">
            All Items
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="locations" data-ocid="inventory.locations.tab">
              Locations
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── All Items Tab ── */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Product Catalog</CardTitle>
                  <CardDescription>
                    {displayedInventory.length} of {inventory.length} products
                  </CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Location filter */}
                  {isAdmin && locations.length > 0 && (
                    <Select
                      value={filterLocationId}
                      onValueChange={setFilterLocationId}
                    >
                      <SelectTrigger
                        className="w-40"
                        data-ocid="inventory.location_filter.select"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All locations</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search items…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-ocid="inventory.search.input"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {displayedInventory.length === 0 ? (
                <div
                  className="text-center py-16"
                  data-ocid="inventory.items.empty_state"
                >
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-1">
                    {searchTerm
                      ? "No items match your search"
                      : "No inventory items yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? "Try a different keyword."
                      : "Add your first product to get started."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedInventory.map((item, idx) => {
                    const isLowStock = lowStockItems.some(
                      (l) => l.id === item.id,
                    );
                    const locationName =
                      locations.find((l) => l.id === item.locationId)?.name ??
                      item.locationId;
                    return (
                      <div
                        key={item.id}
                        className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        data-ocid={`inventory.item.${idx + 1}`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg leading-tight">
                                {item.name}
                              </h3>
                              {isLowStock && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs shrink-0"
                                >
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.brand} · {item.productType}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              Stock
                            </p>
                            <p
                              className={`text-xl font-bold ${isLowStock ? "text-destructive" : ""}`}
                            >
                              {Number(item.quantity)}
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                units
                              </span>
                            </p>
                            {Number(item.unitsPerCarton) > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {(
                                  Number(item.quantity) /
                                  Number(item.unitsPerCarton)
                                ).toLocaleString()}{" "}
                                cartons equivalent
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Cost / unit
                            </p>
                            <p className="font-medium">
                              {hideCostPrices
                                ? "—"
                                : `${symbol}${item.costPrice.toLocaleString()}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Units/carton
                            </p>
                            <p className="font-medium">
                              {Number(item.unitsPerCarton)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Supplier
                            </p>
                            <p className="font-medium truncate">
                              {item.supplier || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Location
                            </p>
                            <p className="font-medium truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {locationName || "Main"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Locations Tab (admin only) ── */}
        {isAdmin && (
          <TabsContent value="locations" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Create location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create Location</CardTitle>
                  <CardDescription>
                    Add a new branch or warehouse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLocation} className="flex gap-2">
                    <Input
                      placeholder="e.g. Main Warehouse"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      required
                      data-ocid="inventory.locations.name.input"
                    />
                    <Button
                      type="submit"
                      disabled={createLocation.isPending}
                      data-ocid="inventory.locations.create.button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Location list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Existing Locations
                  </CardTitle>
                  <CardDescription>
                    {locations.length} location
                    {locations.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <div
                      className="text-center py-6"
                      data-ocid="inventory.locations.empty_state"
                    >
                      <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No locations yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((loc, idx) => (
                        <div
                          key={loc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-ocid={`inventory.locations.item.${idx + 1}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">
                              {loc.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/80 shrink-0"
                            onClick={() => handleDeleteLocation(loc)}
                            disabled={deleteLocation.isPending}
                            data-ocid={`inventory.locations.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

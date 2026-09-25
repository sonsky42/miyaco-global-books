import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { InventoryItem } from "../backend";
import { useActor } from "../hooks/useActor";
import { requireOk } from "./LedgerControls";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function ProductDetailsDialog({
  item,
  admin,
}: { item: InventoryItem; admin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="text-primary underline text-left min-h-9"
        onClick={() => setOpen(true)}
      >
        {item.name}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>
              Product catalog and stock alert settings.
            </DialogDescription>
          </DialogHeader>
          {open && <ProductEditor item={item} admin={admin} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
function ProductEditor({
  item,
  admin,
}: { item: InventoryItem; admin: boolean }) {
  const { actor } = useActor();
  const id = useId();
  const details = useQuery({
    queryKey: ["productDetails", item.id],
    queryFn: () => actor!.getProductDetails(item.id),
    enabled: !!actor,
  });
  const policy = useQuery({
    queryKey: ["stockPolicy", item.id],
    queryFn: () => actor!.getStockPolicy(item.id),
    enabled: !!actor,
  });
  const [description, setDescription] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [minimum, setMinimum] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [lead, setLead] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [fileError, setFileError] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      if (!actor || !policy.data || !details.data)
        throw Error("Wait for product details to load");
      const min = Number(minimum ?? policy.data.minimumUnits);
      const max = Number(target ?? policy.data.targetUnits);
      const days = Number(lead ?? policy.data.leadDays);
      if (
        ![min, max, days].every((n) => Number.isSafeInteger(n) && n >= 0) ||
        max < min ||
        days > 365
      )
        throw Error(
          "Use whole units, target at least minimum, and lead time from 0 to 365 days",
        );
      requireOk(
        await actor.setProductDetails(item.id, {
          description: description ?? details.data.description,
          image: image ?? details.data.image,
        }),
      );
      return requireOk(
        await actor.setStockPolicy(item.id, {
          enabled: enabled ?? policy.data.enabled,
          minimumUnits: BigInt(min),
          targetUnits: BigInt(max),
          leadDays: BigInt(days),
        }),
      );
    },
  });
  if (details.isError || policy.isError)
    return (
      <p role="alert">
        Unable to load product.{" "}
        <Button
          onClick={() => {
            details.refetch();
            policy.refetch();
          }}
        >
          Retry
        </Button>
      </p>
    );
  if (!details.data || !policy.data) return <p>Loading product…</p>;
  const photo = image ?? details.data.image;
  return (
    <div className="space-y-4">
      {photo ? (
        <img
          src={photo}
          alt={item.name}
          width={400}
          height={240}
          className="w-full h-56 rounded object-contain bg-muted"
        />
      ) : (
        <p className="rounded bg-muted p-6 text-center">No product image yet</p>
      )}
      <p>
        {item.brand} · {item.productType} · {item.quantity.toString()} units
        available
      </p>
      {!admin ? (
        <p className="whitespace-pre-wrap">
          {details.data.description || "No description yet."}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Label htmlFor={`${id}-description`}>
            Product description, fitment and part number
          </Label>
          <Textarea
            id={`${id}-description`}
            maxLength={5000}
            value={description ?? details.data.description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Label htmlFor={`${id}-image`}>
            Product image (JPEG, PNG or WebP; maximum 200 KB)
          </Label>
          <Input
            id={`${id}-image`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileError("");
              if (
                file.size > 200000 ||
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              ) {
                setFileError("Choose a JPEG, PNG or WebP image up to 200 KB");
                return;
              }
              try {
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = () => reject(Error("Could not read image"));
                  reader.readAsDataURL(file);
                });
                setImage(data);
              } catch {
                setFileError("Could not read image");
              }
            }}
          />
          {photo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setImage("")}
            >
              Remove image
            </Button>
          )}
          <h3 className="font-semibold pt-3">
            Inventory settings for this product
          </h3>
          <label htmlFor={`${id}-enabled`} className="flex gap-2">
            <input
              id={`${id}-enabled`}
              type="checkbox"
              checked={enabled ?? policy.data.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enable low-stock alerts
          </label>
          <Label htmlFor={`${id}-min`}>Alert at or below (units)</Label>
          <Input
            id={`${id}-min`}
            type="number"
            min="0"
            step="1"
            value={minimum ?? policy.data.minimumUnits.toString()}
            onChange={(e) => setMinimum(e.target.value)}
          />
          <Label htmlFor={`${id}-target`}>Restock target (units)</Label>
          <Input
            id={`${id}-target`}
            type="number"
            min="0"
            step="1"
            value={target ?? policy.data.targetUnits.toString()}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Label htmlFor={`${id}-lead`}>Supplier lead time (days)</Label>
          <Input
            id={`${id}-lead`}
            type="number"
            min="0"
            max="365"
            step="1"
            value={lead ?? policy.data.leadDays.toString()}
            onChange={(e) => setLead(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Set the alert level to expected sales during supplier lead time plus
            safety stock. Use higher buffers for fast-selling shafts/CV joints
            and long delivery times. Keep part numbers and fitment in the
            description. Stock quantities are always units; overselling remains
            blocked.
          </p>
          <p className="text-sm">
            Suggested reorder:{" "}
            {Math.max(
              0,
              Number(target ?? policy.data.targetUnits) - Number(item.quantity),
            )}{" "}
            units. Alerts appear in the app; these settings do not send SMS or
            emails.
          </p>
          {(fileError || save.error) && (
            <p role="alert" className="text-destructive">
              {fileError || save.error?.message}
            </p>
          )}
          {save.isSuccess && <output>Product and stock settings saved.</output>}
          <Button disabled={save.isPending || !!fileError}>
            {save.isPending ? "Saving…" : "Save product and settings"}
          </Button>
        </form>
      )}
    </div>
  );
}

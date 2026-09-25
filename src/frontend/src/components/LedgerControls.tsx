import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { Expense, MutResult, Settlement, Transaction } from "../backend";
import { useActor } from "../hooks/useActor";
import { useIsCallerAdmin } from "../hooks/useQueries";
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

export const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    n,
  );
const dateText = (n: bigint) =>
  new Date(Number(n) / 1e6).toLocaleString("en-NG");
export function requireOk(result: MutResult) {
  if (result.__kind__ === "err") throw new Error(result.err);
  return result.ok;
}
export function useSettlements(bookId: string) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["settlements", bookId],
    queryFn: () => actor!.getSettlements(bookId),
    enabled: !!actor && !!bookId,
  });
}

export function DebtPayments({
  bookId,
  customerName,
}: { bookId: string; customerName?: string }) {
  const { data: admin } = useIsCallerAdmin(bookId);
  const { data = [], isError, refetch } = useSettlements(bookId);
  const debts = data.filter(
    (s) =>
      (s.balance > 0 || s.refundDue > 0) &&
      (!customerName ||
        s.transaction.customerName.trim().toLowerCase() ===
          customerName.trim().toLowerCase()),
  );
  if (!admin) return null;
  return (
    <section
      className="rounded-lg border p-4 space-y-3"
      aria-label="Outstanding customer payments"
    >
      <h2 className="font-semibold">Customer payments and refunds</h2>
      <p className="text-sm text-muted-foreground">
        Record money already received. Part payments remain outstanding until
        settled. This does not charge the customer.
      </p>
      {isError ? (
        <Button onClick={() => refetch()}>Retry balances</Button>
      ) : debts.length === 0 ? (
        <p className="text-sm">
          No outstanding credit sales or active refunds.
        </p>
      ) : (
        debts.map((s) => (
          <div
            className="flex flex-wrap justify-between items-center gap-2 border-t pt-3"
            key={s.transaction.id}
          >
            <div>
              <p>
                {s.transaction.customerName} · {s.transaction.itemName}
              </p>
              <p className="text-sm text-muted-foreground">
                Paid {naira(s.paid)} · Owes {naira(s.balance)}
                {s.refundDue > 0 && ` · Refund due ${naira(s.refundDue)}`}
              </p>
            </div>
            <TransactionLink
              transaction={s.transaction}
              label={
                s.refundDue > 0 ? "Record refund" : "Record full / part payment"
              }
            />
          </div>
        ))
      )}
    </section>
  );
}

export function VoidedRecords({ bookId }: { bookId: string }) {
  const { actor } = useActor();
  const { data: admin } = useIsCallerAdmin(bookId);
  const records = useQuery({
    queryKey: ["voidedTransactions", bookId],
    queryFn: () => actor!.getVoidedTransactions(bookId),
    enabled: !!actor && !!admin,
  });
  if (!admin) return null;
  return (
    <details className="rounded border p-4">
      <summary className="cursor-pointer font-semibold">
        Voided transactions / returns archive
      </summary>
      <p className="text-sm text-muted-foreground py-2">
        Removed from active totals; the original record and correction history
        are retained.
      </p>
      {records.error && (
        <p role="alert">
          Could not load archive.{" "}
          <Button onClick={() => records.refetch()}>Retry</Button>
        </p>
      )}
      {records.data?.map((s) => (
        <div className="border-t py-2" key={s.transaction.id}>
          <TransactionLink transaction={s.transaction} /> ·{" "}
          {s.transaction.customerName} · {s.transaction.itemName}
          {s.refundDue > 0 && (
            <p className="text-destructive">Refund due: {naira(s.refundDue)}</p>
          )}
        </div>
      ))}
      {records.data?.length === 0 && <p>No voided records.</p>}
    </details>
  );
}

export function ExpenseCorrection({ expense }: { expense: Expense }) {
  const { actor } = useActor();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description);
  const [category, setCategory] = useState(expense.category);
  const [date, setDate] = useState(
    new Date(Number(expense.date) / 1e6).toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const [remove, setRemove] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw Error("Connection unavailable");
      if (
        !reason.trim() ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
      )
        throw Error("A positive amount and correction reason are required");
      return requireOk(
        await actor.amendExpense(
          {
            ...expense,
            amount: Number(amount),
            category,
            description,
            date: BigInt(new Date(date).getTime()) * 1000000n,
          },
          expense.amount,
          reason,
          remove,
        ),
      );
    },
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Edit / void expense
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct expense</DialogTitle>
          <DialogDescription>
            Changes recalculate net margin. The audit log keeps the previous
            figures, your identity, time and reason.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <Label htmlFor={`${id}-amount`}>Amount (NGN)</Label>
          <Input
            id={`${id}-amount`}
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            required
            onChange={(e) => setAmount(e.target.value)}
          />
          <Label htmlFor={`${id}-category`}>Category</Label>
          <Input
            id={`${id}-category`}
            value={category}
            required
            onChange={(e) => setCategory(e.target.value)}
          />
          <Label htmlFor={`${id}-description`}>Description</Label>
          <Input
            id={`${id}-description`}
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
          />
          <Label htmlFor={`${id}-date`}>Date</Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
          />
          <Label htmlFor={`${id}-reason`}>Reason (required)</Label>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            required
            onChange={(e) => setReason(e.target.value)}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={remove}
              onChange={(e) => setRemove(e.target.checked)}
            />
            Void this expense instead of editing
          </label>
          {mutation.error && (
            <p role="alert" className="text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : remove
                ? "Confirm void"
                : "Save correction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionLink({
  transaction,
  label,
}: { transaction: Transaction; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="text-primary underline underline-offset-4 text-sm break-all text-left min-h-9"
        onClick={() => setOpen(true)}
      >
        {label || transaction.id}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
            <DialogDescription>
              Receipt, payments and administrator correction history.
            </DialogDescription>
          </DialogHeader>
          {open && <TransactionDetail transaction={transaction} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransactionDetail({ transaction }: { transaction: Transaction }) {
  const { actor } = useActor();
  const { data: admin } = useIsCallerAdmin(transaction.bookId);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["transactionDetail", transaction.id],
    queryFn: () => actor!.getTransactionDetail(transaction.id),
    enabled: !!actor,
  });
  if (isLoading) return <p>Loading transaction…</p>;
  if (error || !data)
    return (
      <div role="alert">
        Could not load this transaction.{" "}
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  const tx = data.transaction;
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {Object.entries({
          ID: tx.id,
          Status: data.voided
            ? "Voided (audit retained)"
            : tx.approved
              ? "Posted"
              : "Pending approval",
          Date: dateText(tx.date),
          Type: tx.typeSubtype,
          Customer: tx.customerName,
          Phone: tx.phone || "—",
          Email: tx.email || "—",
          Item: tx.itemName,
          Brand: tx.brand,
          Category: tx.productType,
          Quantity: `${tx.cartons} × ${tx.unitsPerCarton} units`,
          "Price / quantity": naira(tx.pricePerCarton),
          "Invoice total": naira(tx.amount),
          Paid: naira(data.paid),
          Outstanding: naira(data.balance),
          "Refund due": naira(data.refundDue),
          Method: tx.paymentMethod,
          Notes: tx.notes || "—",
          "Created by": tx.createdBy.toString(),
          ...(admin
            ? {
                "Unit cost snapshot": naira(tx.costPriceAtSale),
                "Realized profit": naira(data.profit),
              }
            : {}),
        }).map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-words font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {admin && (tx.typeSubtype === "Credit Sales" || data.refundDue > 0) && (
        <PaymentForm settlement={data} />
      )}
      <section>
        <h3 className="font-semibold">Payment history</h3>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recorded credit payments.
          </p>
        ) : (
          data.payments.map((p) => (
            <div key={p.id} className="border-t py-2 text-sm">
              <p>
                {naira(p.amount)} · {p.method} · {dateText(p.date)}
              </p>
              <p className="break-all">Recorded by {p.recordedBy.toString()}</p>
              <p>{p.note}</p>
            </div>
          ))
        )}
      </section>
      {admin && !data.voided && <CorrectionForm settlement={data} />}
      {admin && (
        <section className="space-y-3">
          <h3 className="font-semibold">Immutable correction history</h3>
          {data.history.length === 0 && (
            <p className="text-sm text-muted-foreground">No corrections.</p>
          )}
          {data.history.map((h) => (
            <details key={h.revision.toString()} className="border rounded p-3">
              <summary className="cursor-pointer">
                {h.action} · {h.actorName || h.actorPrincipal.toString()} ·{" "}
                {dateText(h.timestamp)}
              </summary>
              <p>{h.reason}</p>
              <p className="text-xs break-all">
                User: {h.actorPrincipal.toString()}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                {(["before", "after"] as const).map((side) => (
                  <div key={side}>
                    <h4 className="font-semibold">
                      {side === "before" ? "Before" : "After"}
                    </h4>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        h[side],
                        (_, value) =>
                          typeof value === "bigint" ? value.toString() : value,
                        2,
                      )}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

function PaymentForm({ settlement: s }: { settlement: Settlement }) {
  const { actor } = useActor();
  const id = useId();
  const [mode, setMode] = useState(
    s.voided || s.transaction.typeSubtype === "Sales" || s.refundDue > 0
      ? "refund"
      : "full",
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Connection unavailable");
      const value = mode === "full" ? s.balance : Number(amount);
      if (!Number.isFinite(value) || value <= 0)
        throw new Error("Enter a positive amount");
      const result =
        mode === "refund"
          ? await actor.refundCreditPayment(
              s.transaction.id,
              requestId,
              value,
              note,
            )
          : await actor.recordCreditPayment(
              s.transaction.id,
              requestId,
              value,
              method,
              note,
            );
      return requireOk(result);
    },
    onSuccess: () => {
      setAmount("");
      setNote("");
      setRequestId(crypto.randomUUID());
    },
  });
  return (
    <form
      className="border rounded p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h3 className="font-semibold">Record payment / refund</h3>
      <Label htmlFor={`${id}-mode`}>Action</Label>
      <select
        id={`${id}-mode`}
        className="w-full border rounded p-2 bg-background"
        value={mode}
        onChange={(e) => {
          setMode(e.target.value);
          setRequestId(crypto.randomUUID());
        }}
      >
        {!s.voided && s.transaction.typeSubtype === "Credit Sales" && (
          <>
            <option value="full">
              Pay full outstanding balance ({naira(s.balance)})
            </option>
            <option value="part">Part payment</option>
          </>
        )}
        <option value="refund">Refund / correct a recorded payment</option>
      </select>
      {mode !== "full" && (
        <>
          <Label htmlFor={`${id}-amount`}>Amount (NGN)</Label>
          <Input
            id={`${id}-amount`}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </>
      )}
      <Label htmlFor={`${id}-method`}>Payment method</Label>
      <Input
        id={`${id}-method`}
        value={method}
        required
        onChange={(e) => setMethod(e.target.value)}
      />
      <Label htmlFor={`${id}-note`}>
        {mode === "refund"
          ? "Refund / correction reason (required)"
          : "Receipt reference / note"}
      </Label>
      <Input
        id={`${id}-note`}
        value={note}
        required={mode === "refund"}
        onChange={(e) => setNote(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Credit profit starts only after total payments cover the item’s cost.
        Confirm a refund here only after money was returned or a mistaken
        payment is being reversed.
      </p>
      {mutation.error && (
        <p role="alert" className="text-destructive">
          {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && <output>{mutation.data}</output>}
      <Button
        disabled={
          mutation.isPending || (!s.voided && mode === "full" && s.balance <= 0)
        }
      >
        {mutation.isPending ? "Saving…" : "Confirm record"}
      </Button>
    </form>
  );
}

function CorrectionForm({ settlement: s }: { settlement: Settlement }) {
  const { actor } = useActor();
  const id = useId();
  const tx = s.transaction;
  const [form, setForm] = useState({
    customerName: tx.customerName,
    phone: tx.phone,
    email: tx.email,
    itemName: tx.itemName,
    cartons: tx.cartons.toString(),
    unitsPerCarton: tx.unitsPerCarton.toString(),
    pricePerCarton: tx.pricePerCarton.toString(),
    notes: tx.notes,
    date: new Date(Number(tx.date) / 1e6).toISOString().slice(0, 10),
  });
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("edit");
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!actor || !confirmed || !reason.trim())
        throw new Error(
          "Enter a reason and confirm the physical stock/refund effects",
        );
      if (action === "void")
        return requireOk(
          await actor.voidTransaction(tx.id, s.revision, reason),
        );
      const quantity = Number(form.cartons);
      const units = Number(form.unitsPerCarton);
      const price = Number(form.pricePerCarton);
      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        !Number.isSafeInteger(units) ||
        units <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      )
        throw new Error("Enter valid quantities and price");
      return requireOk(
        await actor.amendTransaction(
          {
            ...tx,
            ...form,
            date: BigInt(new Date(form.date).getTime()) * 1000000n,
            cartons: BigInt(quantity),
            unitsPerCarton: BigInt(units),
            pricePerCarton: price,
          },
          s.revision,
          reason,
        ),
      );
    },
  });
  return (
    <details className="border rounded p-4">
      <summary className="cursor-pointer font-semibold">
        Admin: edit, return, exchange or void
      </summary>
      <form
        className="space-y-3 mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <p className="text-sm text-muted-foreground">
          For a partial return, reduce the retained quantity. For an exchange,
          select the replacement item and final quantity/price. A full return
          uses void. Only confirm restocking for goods actually returned in
          saleable condition. Damaged goods must be reconciled separately.
          Purchase reversal is blocked when the stock/value is no longer
          available. If increasing a cash sale, first collect any extra payment;
          unpaid additional sales should be recorded separately as credit.
          Refunds remain due until recorded above. Corrections restate the
          original reporting period.
        </p>
        <Label htmlFor={`${id}-action`}>Correction action</Label>
        <select
          id={`${id}-action`}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full border p-2 rounded bg-background"
        >
          <option value="edit">Correct / partial return / exchange</option>
          <option value="void">Void / delete / full return</option>
        </select>
        {action === "edit" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(form).map(([key, value]) => (
              <div key={key}>
                <Label htmlFor={`${id}-${key}`}>
                  {
                    (
                      {
                        customerName: "Customer / supplier",
                        phone: "Phone",
                        email: "Email",
                        itemName: "Exact inventory item name",
                        cartons: "Quantity (cartons or units)",
                        unitsPerCarton:
                          "Units per quantity (1 for single units)",
                        pricePerCarton: "Price per quantity (NGN)",
                        notes: "Notes",
                        date: "Transaction date",
                      } as Record<string, string>
                    )[key]
                  }
                </Label>
                <Input
                  id={`${id}-${key}`}
                  type={key === "date" ? "date" : "text"}
                  value={value}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
        <Label htmlFor={`${id}-reason`}>
          Reason (saved with previous figures and your identity)
        </Label>
        <Textarea
          id={`${id}-reason`}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <label
          className="flex gap-2 items-start text-sm"
          htmlFor={`${id}-confirm`}
        >
          <input
            id={`${id}-confirm`}
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm the stock changes and cash-sale refunds/differences have
          been reconciled. Credit overpayments will show as refund due; record
          the refund separately.
        </label>
        <p className="text-xs text-muted-foreground">
          Corrections restate the original transaction’s reporting period; every
          version remains in history. No money is moved by this app.
        </p>
        {mutation.error && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && <output>{mutation.data}</output>}
        <Button
          disabled={mutation.isPending || !confirmed}
          variant={action === "void" ? "destructive" : "default"}
        >
          {mutation.isPending ? "Saving…" : "Save audited correction"}
        </Button>
      </form>
    </details>
  );
}

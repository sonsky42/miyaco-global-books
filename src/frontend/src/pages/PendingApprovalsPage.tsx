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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  FileText,
  Package,
  Receipt,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useApproveExpense,
  useApproveInventoryItem,
  useApproveTransaction,
  useGetPendingExpenses,
  useGetPendingInventory,
  useGetPendingTransactions,
  useIsCallerAdmin,
  useRejectExpense,
  useRejectInventoryItem,
  useRejectTransaction,
} from "../hooks/useQueries";

interface PendingApprovalsPageProps {
  bookId: string;
}

export default function PendingApprovalsPage({
  bookId,
}: PendingApprovalsPageProps) {
  const { data: pendingTransactions = [], isLoading: txLoading } =
    useGetPendingTransactions(bookId);
  const { data: pendingInventory = [], isLoading: invLoading } =
    useGetPendingInventory(bookId);
  const { data: pendingExpenses = [], isLoading: expLoading } =
    useGetPendingExpenses(bookId);
  const { data: isAdmin } = useIsCallerAdmin();

  const approveTransaction = useApproveTransaction();
  const rejectTransaction = useRejectTransaction();
  const approveInventory = useApproveInventoryItem();
  const rejectInventory = useRejectInventoryItem();
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

  const isLoading = txLoading || invLoading || expLoading;

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      const result = await approveTransaction.mutateAsync(transactionId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast.error("Failed to approve transaction");
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      const result = await rejectTransaction.mutateAsync(transactionId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Failed to reject transaction");
    }
  };

  const handleApproveInventory = async (itemId: string) => {
    try {
      const result = await approveInventory.mutateAsync(itemId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error approving inventory:", error);
      toast.error("Failed to approve inventory item");
    }
  };

  const handleRejectInventory = async (itemId: string) => {
    try {
      const result = await rejectInventory.mutateAsync(itemId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error rejecting inventory:", error);
      toast.error("Failed to reject inventory item");
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      const result = await approveExpense.mutateAsync(expenseId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error("Failed to approve expense");
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      const result = await rejectExpense.mutateAsync(expenseId);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Admin Access Required
            </h2>
            <p className="text-muted-foreground">
              Only administrators can view and approve pending items.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalPending =
    pendingTransactions.length +
    pendingInventory.length +
    pendingExpenses.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve submissions from non-admin users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Items
          </CardTitle>
          <CardDescription>
            {totalPending} {totalPending === 1 ? "item" : "items"} awaiting
            approval
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="gap-2">
            <FileText className="h-4 w-4" />
            Transactions ({pendingTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory ({pendingInventory.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({pendingExpenses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Pending Transactions</CardTitle>
              <CardDescription>
                Transactions submitted by non-admin users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No pending transactions
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {pendingTransactions.map((tx) => (
                      <div key={tx.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{tx.typeSubtype}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  Number(tx.date) / 1000000,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-semibold">{tx.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.itemName} • {Number(tx.cartons)} cartons ×{" "}
                              {Number(tx.unitsPerCarton)} units
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {tx.currency === "NGN" ? "₦" : "$"}
                              {tx.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            onClick={() => handleApproveTransaction(tx.id)}
                            disabled={approveTransaction.isPending}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTransaction(tx.id)}
                            disabled={rejectTransaction.isPending}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Pending Inventory Items</CardTitle>
              <CardDescription>
                Inventory additions submitted by non-admin users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No pending inventory items
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {pendingInventory.map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.brand} • {item.productType}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Stock
                            </p>
                            <p className="text-lg font-bold">
                              {Number(item.quantity)} units
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground">Cost</p>
                            <p className="font-medium">
                              ₦{item.costPrice.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Supplier</p>
                            <p className="font-medium">{item.supplier}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            onClick={() => handleApproveInventory(item.id)}
                            disabled={approveInventory.isPending}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectInventory(item.id)}
                            disabled={rejectInventory.isPending}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Pending Expenses</CardTitle>
              <CardDescription>
                Expense records submitted by non-admin users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending expenses</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {pendingExpenses.map((expense) => (
                      <div key={expense.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {expense.category}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  Number(expense.date) / 1000000,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-medium">{expense.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-destructive">
                              ₦{expense.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            onClick={() => handleApproveExpense(expense.id)}
                            disabled={approveExpense.isPending}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectExpense(expense.id)}
                            disabled={rejectExpense.isPending}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

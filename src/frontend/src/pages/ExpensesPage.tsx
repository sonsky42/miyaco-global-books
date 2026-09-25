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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Expense } from "../backend";
import { ExpenseCorrection } from "../components/LedgerControls";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddExpense,
  useGetExpenses,
  useIsCallerAdmin,
} from "../hooks/useQueries";

interface ExpensesPageProps {
  bookId: string;
}

export default function ExpensesPage({ bookId }: ExpensesPageProps) {
  const { data: expenses = [], isLoading } = useGetExpenses(bookId);
  const addExpense = useAddExpense();
  const { data: admin } = useIsCallerAdmin(bookId);
  const { identity } = useInternetIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identity) {
      toast.error("You must be logged in to add expenses");
      return;
    }

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      date: BigInt(date.getTime() * 1000000),
      category: formData.category,
      description: formData.description,
      amount: Number.parseFloat(formData.amount),
      bookId,
      createdBy: identity.getPrincipal(),
      approved: false,
    };

    try {
      const result = await addExpense.mutateAsync(expense);
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
        return;
      }
      setDialogOpen(false);
      setFormData({
        category: "",
        description: "",
        amount: "",
      });
      setDate(new Date());
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!admin)
    return <p>Expense records are restricted to book administrators.</p>;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage business expenses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>
                Record a new business expense
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., Rent, Utilities, Salaries"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={addExpense.isPending}
              >
                {addExpense.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Expenses</CardTitle>
          <CardDescription>{expenses.length} expense records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">
            ₦{totalExpenses.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>Complete expense history</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expenses recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{expense.category}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            Number(expense.date) / 1000000,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {expense.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-destructive">
                        ₦{expense.amount.toLocaleString()}
                      </p>
                      <ExpenseCorrection expense={expense} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

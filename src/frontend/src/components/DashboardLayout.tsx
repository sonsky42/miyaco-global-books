import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Clock,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetUserBooks, useIsCallerAdmin } from "../hooks/useQueries";
import AnalyticsPage from "../pages/AnalyticsPage";
import BookSelectionPage from "../pages/BookSelectionPage";
import CustomersPage from "../pages/CustomersPage";
import DashboardPage from "../pages/DashboardPage";
import ExpensesPage from "../pages/ExpensesPage";
import InventoryPage from "../pages/InventoryPage";
import PendingApprovalsPage from "../pages/PendingApprovalsPage";
import SettingsPage from "../pages/SettingsPage";
import TransactionsPage from "../pages/TransactionsPage";

type Page =
  | "book-selection"
  | "dashboard"
  | "transactions"
  | "expenses"
  | "customers"
  | "inventory"
  | "analytics"
  | "settings"
  | "pending";

interface DashboardLayoutProps {
  booksError?: boolean;
}

export default function DashboardLayout({ booksError }: DashboardLayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>("book-selection");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const {
    data: userBooks = [],
    isLoading: booksLoading,
    isError: booksQueryError,
    refetch: refetchBooks,
  } = useGetUserBooks();
  const { data: isAdmin } = useIsCallerAdmin();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleBookSelected = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentPage("dashboard");
  };

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  const handleChangeBook = () => {
    setCurrentPage("book-selection");
    setSelectedBookId("");
    setMobileMenuOpen(false);
  };

  // If user books query has a persistent error, show a recovery UI
  const hasError = booksError || booksQueryError;
  if (hasError && currentPage === "book-selection" && !booksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Unable to load books</h2>
          <p className="text-muted-foreground text-sm mb-6">
            There was a problem connecting to the backend. Please try again.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => refetchBooks()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Always show book selection if no book is selected or on book-selection page
  if (currentPage === "book-selection" || !selectedBookId) {
    return <BookSelectionPage onBookSelected={handleBookSelected} />;
  }

  // Find the current book and check if user is admin
  const currentBook = userBooks.find((book) => book.id === selectedBookId);
  const currentBookName = currentBook?.name || "Loading…";
  const isBookAdmin =
    currentBook &&
    identity &&
    (currentBook.admin.toString() === identity.getPrincipal().toString() ||
      currentBook.adminMembers.some(
        (admin) => admin.toString() === identity.getPrincipal().toString(),
      ));

  const navigation = [
    {
      name: "Dashboard",
      icon: Home,
      page: "dashboard" as Page,
      adminOnly: false,
    },
    {
      name: "Transactions",
      icon: FileText,
      page: "transactions" as Page,
      adminOnly: false,
    },
    {
      name: "Expenses",
      icon: Receipt,
      page: "expenses" as Page,
      adminOnly: false,
    },
    {
      name: "Customers",
      icon: Users,
      page: "customers" as Page,
      adminOnly: false,
    },
    {
      name: "Inventory",
      icon: Package,
      page: "inventory" as Page,
      adminOnly: false,
    },
    {
      name: "Analytics",
      icon: BarChart3,
      page: "analytics" as Page,
      adminOnly: true,
    },
    {
      name: "Settings",
      icon: Settings,
      page: "settings" as Page,
      adminOnly: false,
    },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <DashboardPage
            bookId={selectedBookId}
            onNavigate={(page) => handlePageChange(page as Page)}
          />
        );
      case "transactions":
        return <TransactionsPage bookId={selectedBookId} />;
      case "expenses":
        return <ExpensesPage bookId={selectedBookId} />;
      case "customers":
        return <CustomersPage bookId={selectedBookId} />;
      case "inventory":
        return <InventoryPage bookId={selectedBookId} isAdmin={!!isAdmin} />;
      case "analytics":
        return <AnalyticsPage bookId={selectedBookId} />;
      case "settings":
        return <SettingsPage bookId={selectedBookId} />;
      case "pending":
        return <PendingApprovalsPage bookId={selectedBookId} />;
      default:
        return <DashboardPage bookId={selectedBookId} />;
    }
  };

  const NavItems = ({ onNavigate }: { onNavigate: (p: Page) => void }) => (
    <>
      <button
        type="button"
        onClick={handleChangeBook}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        data-ocid="nav.change_book.button"
      >
        <BookOpen className="h-5 w-5" />
        Change Book
      </button>
      {isBookAdmin && (
        <button
          type="button"
          onClick={() => onNavigate("pending")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            currentPage === "pending"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          data-ocid="nav.pending.tab"
        >
          <Clock className="h-5 w-5" />
          Pending
          <Badge variant="secondary" className="ml-auto">
            Admin
          </Badge>
        </button>
      )}
      {navigation
        .filter((item) => !item.adminOnly || isBookAdmin)
        .map((item) => (
          <button
            type="button"
            key={item.name}
            onClick={() => onNavigate(item.page)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              currentPage === item.page
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-ocid={`nav.${item.page}.tab`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </button>
        ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/assets/icon.png" alt="Miyaco" className="h-8 w-8" />
            <span className="font-semibold">Miyaco Global Books</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-ocid="nav.mobile_menu.toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="p-6 border-b">
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src="/assets/icon.png"
                      alt="Miyaco"
                      className="h-8 w-8"
                    />
                    <span className="font-semibold">Miyaco</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-1">
                      Current Book:
                    </p>
                    <p className="font-medium text-primary truncate">
                      {currentBookName}
                    </p>
                  </div>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                  <NavItems
                    onNavigate={(p) => {
                      handlePageChange(p);
                      setMobileMenuOpen(false);
                    }}
                  />
                </nav>
                <div className="border-t p-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleLogout}
                    data-ocid="nav.logout.button"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-muted/10">
          <div className="flex flex-col border-b px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <img src="/assets/icon.png" alt="Miyaco" className="h-8 w-8" />
              <span className="font-semibold">Miyaco Global Books</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Current Book:
              </p>
              <p
                className="text-sm font-semibold text-primary truncate"
                title={currentBookName}
              >
                {currentBookName}
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <NavItems onNavigate={handlePageChange} />
          </nav>
          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleLogout}
              data-ocid="nav.logout.button"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

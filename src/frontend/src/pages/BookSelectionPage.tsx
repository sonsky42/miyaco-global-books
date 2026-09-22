import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AccountingBook } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateAccountingBook,
  useDeleteBook,
  useGetUserBooks,
  useGetUserDisplayName,
  useGetUserJoinRequests,
  useRemoveSelfFromBook,
  useRequestJoinBook,
  useSearchAccountingBooks,
} from "../hooks/useQueries";

interface BookSelectionPageProps {
  onBookSelected: (bookId: string) => void;
}

function BookCard({
  book,
  onSelect,
  onRemoveSelf,
  onDelete,
  isRemoving,
  isPermanentAdmin,
}: {
  book: AccountingBook;
  onSelect: () => void;
  onRemoveSelf: () => void;
  onDelete: () => void;
  isRemoving: boolean;
  isPermanentAdmin: boolean;
}) {
  const { data: adminName } = useGetUserDisplayName(book.admin.toString());

  return (
    <Card className="hover:border-primary transition-colors">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{book.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Users className="h-3 w-3 shrink-0" />
            <span>
              {book.members.length} member{book.members.length !== 1 ? "s" : ""}
            </span>
            <span>•</span>
            <span className="truncate">Admin: {adminName || "Loading…"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Created{" "}
            {new Date(Number(book.createdAt) / 1000000).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {isPermanentAdmin ? (
            // Permanent admin: show delete book button (deletes for everyone)
            <Button
              onClick={onDelete}
              disabled={isRemoving}
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete this book (permanent)"
              data-ocid="book_selection.delete_book.button"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            // Non-permanent-admin: leaves book only
            <Button
              onClick={onRemoveSelf}
              disabled={isRemoving}
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Leave this book"
              data-ocid="book_selection.leave_book.button"
            >
              <UserMinus className="h-4 w-4" />
              {isRemoving ? "Leaving…" : "Leave"}
            </Button>
          )}
          <Button
            onClick={onSelect}
            size="sm"
            className="gap-2"
            data-ocid="book_selection.open_book.button"
          >
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchResultCard({
  book,
  onRequestJoin,
  isRequesting,
  hasPendingRequest,
}: {
  book: AccountingBook;
  onRequestJoin: () => void;
  isRequesting: boolean;
  hasPendingRequest: boolean;
}) {
  const { data: adminName } = useGetUserDisplayName(book.admin.toString());

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{book.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Users className="h-3 w-3 shrink-0" />
            <span>
              {book.members.length} member{book.members.length !== 1 ? "s" : ""}
            </span>
            <span>•</span>
            <span className="truncate">Admin: {adminName || "Loading…"}</span>
          </div>
        </div>
        {hasPendingRequest ? (
          <Badge variant="outline" className="gap-1 ml-2 shrink-0">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        ) : (
          <Button
            onClick={onRequestJoin}
            disabled={isRequesting}
            size="sm"
            className="ml-2 shrink-0 gap-2"
            data-ocid="book_selection.request_join.button"
          >
            {isRequesting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {isRequesting ? "Requesting…" : "Request to Join"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function BookSelectionPage({
  onBookSelected,
}: BookSelectionPageProps) {
  const [newBookName, setNewBookName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AccountingBook[]>([]);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<AccountingBook | null>(null);

  const {
    data: userBooks = [],
    isLoading: booksLoading,
    isError: booksError,
    refetch: refetchBooks,
  } = useGetUserBooks();
  const { data: joinRequests = [] } = useGetUserJoinRequests();
  const createBook = useCreateAccountingBook();
  const searchBooks = useSearchAccountingBooks();
  const requestJoin = useRequestJoinBook();
  const removeSelf = useRemoveSelfFromBook();
  const deleteBook = useDeleteBook();
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const pendingRequests = joinRequests.filter(
    ([_, status]) => status === "pending",
  );

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) {
      toast.error("Please enter a book name");
      return;
    }
    try {
      const bookId = await createBook.mutateAsync(newBookName.trim());
      toast.success(
        "Accounting book created! You have immediate access as the creator.",
      );
      setNewBookName("");
      onBookSelected(bookId);
    } catch (error) {
      console.error("Error creating book:", error);
      toast.error("Failed to create accounting book. Please try again.");
    }
  };

  const handleSearchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }
    try {
      const results = await searchBooks.mutateAsync(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("No accounting books found with that name");
      }
    } catch (error) {
      console.error("Error searching books:", error);
      toast.error("Failed to search accounting books");
    }
  };

  const handleRequestJoin = async (bookId: string) => {
    try {
      const result = await requestJoin.mutateAsync(bookId);
      if (result.__kind__ === "ok") {
        toast.success(
          result.ok || "Join request sent! The admin will review it.",
        );
        // Keep results visible so user can see the pending badge
      } else {
        toast.error(result.err || "Failed to send join request");
      }
    } catch (error) {
      console.error("Error requesting to join book:", error);
      toast.error("Failed to send join request. Please try again.");
    }
  };

  const handleRemoveSelfClick = (book: AccountingBook) => {
    setSelectedBook(book);
    setRemoveDialogOpen(true);
  };

  const handleDeleteBookClick = (book: AccountingBook) => {
    setSelectedBook(book);
    setDeleteDialogOpen(true);
  };

  const handleRemoveSelfConfirm = async () => {
    if (!selectedBook) return;
    try {
      const result = await removeSelf.mutateAsync(selectedBook.id);
      if (result.__kind__ === "ok") {
        toast.success(result.ok || "You have left the book.");
        setRemoveDialogOpen(false);
        setSelectedBook(null);
      } else {
        toast.error(result.err || "Failed to leave book");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to leave book";
      toast.error(msg);
    }
  };

  const handleDeleteBookConfirm = async () => {
    if (!selectedBook) return;
    try {
      const result = await deleteBook.mutateAsync(selectedBook.id);
      if (result.__kind__ === "ok") {
        toast.success(result.ok || "Book deleted successfully.");
        setDeleteDialogOpen(false);
        setSelectedBook(null);
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      } else {
        toast.error(result.err || "Failed to delete book");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to delete book";
      toast.error(msg);
    }
  };

  const hasPendingRequestForBook = (bookId: string) =>
    joinRequests.some(([id, status]) => id === bookId && status === "pending");

  const isPermanentAdmin = (book: AccountingBook): boolean => {
    if (!identity) return false;
    return book.admin.toString() === identity.getPrincipal().toString();
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  // Loading state
  if (booksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your books…</p>
        </div>
      </div>
    );
  }

  // Error state — still show the page but with a retry notice
  if (booksError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-destructive/70 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Could not load books</h2>
          <p className="text-muted-foreground text-sm mb-6">
            There was a problem reaching the backend. Please try again.
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">
              Welcome to Miyaco Global Books
            </CardTitle>
            <CardDescription className="text-base">
              {userBooks.length > 0
                ? "Select an accounting book to continue or create a new one"
                : "Create a new accounting book or request to join an existing one to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Pending requests notice */}
            {pendingRequests.length > 0 && (
              <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  You have {pendingRequests.length} pending join request
                  {pendingRequests.length !== 1 ? "s" : ""}. The book admin will
                  review your request{pendingRequests.length !== 1 ? "s" : ""}{" "}
                  soon.
                </AlertDescription>
              </Alert>
            )}

            {/* Existing books list */}
            {userBooks.length > 0 && (
              <div className="mb-6">
                <Label className="text-base font-semibold mb-3 block">
                  Your Accounting Books
                </Label>
                <div className="space-y-2">
                  {userBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelect={() => onBookSelected(book.id)}
                      onRemoveSelf={() => handleRemoveSelfClick(book)}
                      onDelete={() => handleDeleteBookClick(book)}
                      isRemoving={removeSelf.isPending || deleteBook.isPending}
                      isPermanentAdmin={isPermanentAdmin(book)}
                    />
                  ))}
                </div>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Create / Join Tabs */}
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="create"
                  data-ocid="book_selection.create_tab"
                >
                  Create New Book
                </TabsTrigger>
                <TabsTrigger value="join" data-ocid="book_selection.join_tab">
                  Join Existing Book
                </TabsTrigger>
              </TabsList>

              {/* Create tab */}
              <TabsContent value="create" className="space-y-4 mt-6">
                <form onSubmit={handleCreateBook} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bookName">Accounting Book Name</Label>
                    <Input
                      id="bookName"
                      data-ocid="book_selection.book_name.input"
                      value={newBookName}
                      onChange={(e) => setNewBookName(e.target.value)}
                      placeholder="e.g., My Store 2025"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      You will become the permanent admin of this book with
                      immediate access
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={createBook.isPending}
                    data-ocid="book_selection.create_book.submit_button"
                  >
                    {createBook.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Accounting Book
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Join tab */}
              <TabsContent value="join" className="space-y-4 mt-6">
                <form onSubmit={handleSearchBooks} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchQuery">
                      Search for Accounting Book
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="searchQuery"
                        data-ocid="book_selection.search.input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter book name"
                        required
                      />
                      <Button
                        type="submit"
                        disabled={searchBooks.isPending}
                        data-ocid="book_selection.search.button"
                      >
                        {searchBooks.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Search for a book and request to join. The book admin will
                      review your request.
                    </p>
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Search Results</Label>
                    <div
                      className="space-y-2"
                      data-ocid="book_selection.search_results.list"
                    >
                      {searchResults.map((book) => (
                        <SearchResultCard
                          key={book.id}
                          book={book}
                          onRequestJoin={() => handleRequestJoin(book.id)}
                          isRequesting={requestJoin.isPending}
                          hasPendingRequest={hasPendingRequestForBook(book.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Return to login */}
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleLogout}
                data-ocid="book_selection.return_to_login.button"
              >
                <LogOut className="h-4 w-4" />
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave book confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent data-ocid="book_selection.leave_book.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Accounting Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave{" "}
              <strong>{selectedBook?.name}</strong>? You will immediately lose
              access to all data in this book and must send a new join request
              to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={removeSelf.isPending}
              data-ocid="book_selection.leave_book.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSelfConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeSelf.isPending}
              data-ocid="book_selection.leave_book.confirm_button"
            >
              {removeSelf.isPending ? "Leaving…" : "Leave Book"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete book confirmation (permanent admin only) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="book_selection.delete_book.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Accounting Book
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedBook?.name}</strong>{" "}
              and remove all {selectedBook?.members.length ?? 0} member
              {(selectedBook?.members.length ?? 0) !== 1 ? "s" : ""} from the
              book. This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteBook.isPending}
              data-ocid="book_selection.delete_book.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBookConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBook.isPending}
              data-ocid="book_selection.delete_book.confirm_button"
            >
              {deleteBook.isPending ? "Deleting…" : "Delete Book Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountingBook,
  ApprovalStatus,
  Customer,
  Expense,
  InventoryItem,
  JoinRequest,
  JoinRequestResult,
  MutResult,
  SystemSettings,
  Transaction,
  UserProfile,
  UserRole,
} from "../backend";
import { UserRole as UserRoleEnum } from "../backend";
import { useActor } from "./useActor";

// Local type for approval info (backend returns tuples, we map to objects)
export interface UserApprovalInfo {
  principal: Principal;
  status: ApprovalStatus;
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal: Principal | string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal.toString()],
    queryFn: async () => {
      if (!actor) return null;
      const principalObj =
        typeof principal === "string"
          ? Principal.fromText(principal)
          : principal;
      return actor.getUserProfile(principalObj);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetUserDisplayName(principal: Principal | string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string>({
    queryKey: ["userDisplayName", principal.toString()],
    queryFn: async () => {
      if (!actor) return "Unknown User";
      const principalObj =
        typeof principal === "string"
          ? Principal.fromText(principal)
          : principal;
      return actor.getUserDisplayName(principalObj);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetBookMembersWithNames(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, string, boolean]>>({
    queryKey: ["bookMembers", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBookMembersWithNames(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userDisplayName"] });
    },
  });
}

// Accounting Book Queries
export function useGetUserBooks() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AccountingBook[]>({
    queryKey: ["userBooks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserBooks();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGetUserJoinRequests() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[string, ApprovalStatus]>>({
    queryKey: ["userJoinRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserJoinRequests();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 15_000, // was 3000 — too aggressive; 15 s is sufficient
    staleTime: 10_000,
    retry: 1,
  });
}

export function useCreateAccountingBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createAccountingBook(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      queryClient.invalidateQueries({ queryKey: ["accountingBooks"] });
      queryClient.invalidateQueries({ queryKey: ["isApproved"] });
      queryClient.invalidateQueries({ queryKey: ["userJoinRequests"] });
    },
  });
}

export function useSearchAccountingBooks() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.searchAccountingBooks(name);
    },
  });
}

export function useRequestJoinBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<JoinRequestResult, Error, string>({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestJoinBook(bookId);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        // Invalidate join requests AND user books so UI reflects pending status
        queryClient.invalidateQueries({ queryKey: ["userJoinRequests"] });
        queryClient.invalidateQueries({ queryKey: ["pendingJoinRequests"] });
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      }
    },
  });
}

export function useGetPendingJoinRequests() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<JoinRequest[]>({
    queryKey: ["pendingJoinRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingJoinRequests();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 15_000, // was 3000 ms — slowed to 15 s to reduce load
    staleTime: 10_000,
    retry: 1,
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    JoinRequestResult,
    Error,
    { requestId: string; isAdmin: boolean }
  >({
    mutationFn: async ({ requestId, isAdmin }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveJoinRequest(requestId, isAdmin);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({ queryKey: ["pendingJoinRequests"] });
        queryClient.invalidateQueries({ queryKey: ["bookMembers"] });
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
        queryClient.invalidateQueries({ queryKey: ["userJoinRequests"] });
      }
    },
  });
}

export function useRejectJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<JoinRequestResult, Error, string>({
    mutationFn: async (requestId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectJoinRequest(requestId);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({ queryKey: ["pendingJoinRequests"] });
        queryClient.invalidateQueries({ queryKey: ["userJoinRequests"] });
      }
    },
  });
}

export function useRemoveUserFromBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    JoinRequestResult,
    Error,
    { bookId: string; user: Principal | string }
  >({
    mutationFn: async ({ bookId, user }) => {
      if (!actor) throw new Error("Actor not available");
      const principalText = typeof user === "string" ? user : user.toText();
      return actor.removeUserFromBook(bookId, principalText);
    },
    onSuccess: (result, variables) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({
          queryKey: ["bookMembers", variables.bookId],
        });
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      }
    },
  });
}

export function useRemoveSelfFromBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<JoinRequestResult, Error, string>({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeSelfFromBook(bookId);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
        queryClient.invalidateQueries({ queryKey: ["bookMembers"] });
      }
    },
  });
}

export function useDeleteBook() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<JoinRequestResult, Error, string>({
    mutationFn: async (bookId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteBook(bookId);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
        queryClient.invalidateQueries({ queryKey: ["bookMembers"] });
        queryClient.invalidateQueries({ queryKey: ["accountingBooks"] });
      }
    },
  });
}

export function useChangeUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    JoinRequestResult,
    Error,
    { bookId: string; user: Principal | string; makeAdmin: boolean }
  >({
    mutationFn: async ({ bookId, user, makeAdmin }) => {
      if (!actor) throw new Error("Actor not available");
      const principalText = typeof user === "string" ? user : user.toText();
      return actor.changeUserRole(bookId, principalText, makeAdmin);
    },
    onSuccess: (result, variables) => {
      if (result.__kind__ === "ok") {
        queryClient.invalidateQueries({
          queryKey: ["bookMembers", variables.bookId],
        });
        queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      }
    },
  });
}

// Dashboard Metrics Query — now includes customersWithDebt, totalOutstandingDebt, recentTransactions, pendingCount, lowStockCount
export function useGetDashboardMetrics(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{
    inventoryItems: bigint;
    lowStockAlerts: bigint;
    lowStockCount: bigint;
    grossMargin: bigint;
    totalInflows: bigint;
    lowStockItems: Array<[string, bigint, bigint]>;
    totalCustomers: bigint;
    customersWithDebt: bigint;
    totalOutstandingDebt: bigint;
    recentTransactions: Array<Transaction>;
    pendingCount: bigint;
  }>({
    queryKey: ["dashboardMetrics", bookId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.getDashboardMetrics(bookId);
      // Normalize: backend may return lowStockCount but UI uses lowStockAlerts
      return {
        ...result,
        lowStockAlerts:
          result.lowStockCount ?? result.lowStockItems?.length ?? BigInt(0),
      };
    },
    enabled: !!actor && !actorFetching && !!bookId,
    // Refresh every 30 s for live feel; staleTime 0 so mutations trigger immediate refetch
    refetchInterval: 30_000,
    staleTime: 0,
    retry: 1,
  });
}

// Outstanding Credits Query
export function useGetOutstandingCredits(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{
    customersWithDebt: bigint;
    totalOutstanding: number;
    outstandingCredits: Array<{
      balance: number;
      debtor: string;
      totalOwed: number;
      amountPaid: number;
      paybackDate: bigint;
    }>;
  }>({
    queryKey: ["outstandingCredits", bookId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getOutstandingCredits(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

// Top Items and Customers Query
export function useGetTopItemsAndCustomers(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{
    topItems: Array<{
      sku: string;
      grossProfit: number;
      totalUnitsSold: bigint;
      brand: string;
    }>;
    topCustomers: Array<{
      name: string;
      lastSaleDate: bigint;
      totalSpent: number;
    }>;
  }>({
    queryKey: ["topItemsAndCustomers", bookId],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTopItemsAndCustomers(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

// Transaction Queries
export function useGetTransactions(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["transactions", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactions(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetRecentTransactions(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["recentTransactions", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentTransactions(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetTransactionsByType(
  bookId: string,
  transactionType: string,
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["transactions", bookId, transactionType],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactionsByType(bookId, transactionType);
    },
    enabled: !!actor && !actorFetching && !!bookId && !!transactionType,
  });
}

export function useGetTransactionStatistics(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{
    sales: number;
    creditSales: number;
    purchases: number;
    creditPurchases: number;
  }>({
    queryKey: ["transactionStatistics", bookId],
    queryFn: async () => {
      if (!actor)
        return { sales: 0, creditSales: 0, purchases: 0, creditPurchases: 0 };
      return actor.getTransactionStatistics(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetPendingTransactions(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["pendingTransactions", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingTransactions(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useAddTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addTransaction(transaction);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recentTransactions", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["transactionStatistics", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboardMetrics", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["outstandingCredits", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topItemsAndCustomers", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customerNames", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pendingTransactions", variables.bookId],
      });
    },
  });
}

export function useApproveTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (transactionId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveTransaction(transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pendingTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactionStatistics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerNames"] });
    },
  });
}

export function useRejectTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (transactionId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectTransaction(transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingTransactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      bookId: _bookId,
    }: { transactionId: string; bookId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTransaction(transactionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recentTransactions", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["transactionStatistics", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboardMetrics", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["outstandingCredits", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topItemsAndCustomers", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customerNames", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.bookId],
      });
    },
  });
}

// Customer Queries
export function useGetCustomers(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ["customers", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCustomers(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetCustomerNames(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["customerNames", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCustomerNames(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 30000,
  });
}

export function useSearchCustomers(bookId: string, searchTerm: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ["searchCustomers", bookId, searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm.trim()) return [];
      return actor.searchCustomers(bookId, searchTerm.trim());
    },
    enabled:
      !!actor && !actorFetching && !!bookId && searchTerm.trim().length >= 1,
  });
}

export function useAddCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Customer) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addCustomer(customer);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customerNames", variables.bookId],
      });
    },
  });
}

// Inventory Queries
export function useGetInventoryItemNames(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["inventoryItemNames", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventoryItemNames(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 30000,
  });
}

export function useGetInventory(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventoryItem[]>({
    queryKey: ["inventory", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventory(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetPendingInventory(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InventoryItem[]>({
    queryKey: ["pendingInventory", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingInventory(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addInventoryItem(item);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pendingInventory", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboardMetrics", variables.bookId],
      });
    },
  });
}

export function useApproveInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (itemId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveInventoryItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
    },
  });
}

export function useRejectInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (itemId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectInventoryItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInventory"] });
    },
  });
}

// Location Queries
export function useGetLocations(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["locations", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLocations(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useCreateLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, name }: { bookId: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createLocation(bookId, name);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["locations", variables.bookId],
      });
    },
  });
}

export function useDeleteLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      locationId,
    }: { bookId: string; locationId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteLocation(bookId, locationId);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["locations", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.bookId],
      });
    },
  });
}

export function useGetInventoryByLocation(bookId: string, locationId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["inventoryByLocation", bookId, locationId],
    queryFn: async () => {
      if (!actor || !locationId) return [];
      return actor.getInventoryByLocation(bookId, locationId);
    },
    enabled: !!actor && !actorFetching && !!bookId && !!locationId,
  });
}

export function useTransferInventory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      unit,
    }: {
      bookId: string;
      itemId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: bigint;
      unit: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.transferInventory(
        bookId,
        itemId,
        fromLocationId,
        toLocationId,
        quantity,
        unit,
      );
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventoryByLocation", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboardMetrics", variables.bookId],
      });
    },
  });
}

export function useGetInventoryTransfers(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["inventoryTransfers", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventoryTransfers(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetLowStockAlerts(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["lowStockAlerts", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLowStockAlerts(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
    refetchInterval: 30_000,
  });
}

export function useSearchInventory(bookId: string, searchTerm: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["searchInventory", bookId, searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm.trim()) return [];
      return actor.searchInventory(bookId, searchTerm);
    },
    enabled: !!actor && !actorFetching && !!bookId && !!searchTerm.trim(),
  });
}

// Expense Queries
export function useGetExpenses(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Expense[]>({
    queryKey: ["expenses", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExpenses(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useGetPendingExpenses(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Expense[]>({
    queryKey: ["pendingExpenses", bookId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingExpenses(bookId);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useAddExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Expense) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addExpense(expense);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["expenses", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pendingExpenses", variables.bookId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboardMetrics", variables.bookId],
      });
    },
  });
}

export function useApproveExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (expenseId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveExpense(expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["pendingExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
    },
  });
}

export function useRejectExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MutResult, Error, string>({
    mutationFn: async (expenseId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectExpense(expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingExpenses"] });
    },
  });
}

// System Settings Queries
export function useGetSystemSettings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SystemSettings | null>({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSystemSettings();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUpdateSystemSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: SystemSettings) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateSystemSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
  });
}

// Currency Conversion Query
export function useGetCurrencyConversion() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string>({
    queryKey: ["currencyConversion"],
    queryFn: async () => {
      if (!actor) return "";
      // getCurrencyConversion not available in current backend version
      return "";
    },
    enabled: !!actor && !actorFetching,
    // Was 5000 ms — caused constant network hammering; rate is static for now
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
  });
}

// User Approval Queries
export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isApproved"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isApproved"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      if (!actor) return [];
      const tuples = await actor.listApprovals();
      return tuples.map(([principal, status]) => ({ principal, status }));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      status,
    }: { user: Principal | string; status: ApprovalStatus }) => {
      if (!actor) throw new Error("Actor not available");
      const principalObj =
        typeof user === "string" ? Principal.fromText(user) : user;
      return actor.setApproval(principalObj, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

// Admin Queries
export function useGetGrossMarginByPeriod(
  bookId: string,
  startTime: bigint,
  endTime: bigint,
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: [
      "grossMarginByPeriod",
      bookId,
      startTime.toString(),
      endTime.toString(),
    ],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getGrossMarginByPeriod(bookId, startTime, endTime);
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useIsCallerAdmin(bookId?: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isAdmin", bookId ?? "global"],
    queryFn: async () => {
      if (!actor) return false;
      return bookId ? actor.isCallerBookAdmin(bookId) : actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) return UserRoleEnum.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAssignCallerUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      role,
    }: { user: Principal | string; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      const principalObj =
        typeof user === "string" ? Principal.fromText(user) : user;
      return actor.assignCallerUserRole(principalObj, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

// Book Settings Queries
export function useGetBookSettings(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").BookSettings | null>({
    queryKey: ["bookSettings", bookId],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getBookSettings(bookId);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !!actor && !actorFetching && !!bookId,
  });
}

export function useUpdateBookSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      settings,
    }: { bookId: string; settings: import("../backend").BookSettings }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBookSettings(bookId, settings);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["bookSettings", variables.bookId],
      });
    },
  });
}

// Audit Log Query
export function useGetAuditLog(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").AuditLogEntry[]>({
    queryKey: ["auditLog", bookId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAuditLog(bookId);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 30_000,
  });
}

// Scheduled Summary Query
export function useGetOrGenerateScheduledSummary(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").ScheduledSummary | null>({
    queryKey: ["scheduledSummary", bookId],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getOrGenerateScheduledSummary(bookId);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

// Customer Statement Query
export function useGetCustomerStatement(bookId: string, customerName: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").CustomerStatement | null>({
    queryKey: ["customerStatement", bookId, customerName],
    queryFn: async () => {
      if (!actor || !customerName.trim()) return null;
      const result = await actor.getCustomerStatement(bookId, customerName);
      if (result.__kind__ === "ok") return result.ok;
      return null;
    },
    enabled: !!actor && !actorFetching && !!bookId && !!customerName.trim(),
    staleTime: 30_000,
  });
}

// Aging Report Query
export function useGetAgingReport(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").AgingBucket[]>({
    queryKey: ["agingReport", bookId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAgingReport(bookId);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 60_000,
  });
}

// Draft Purchase Order Queries
export function useGetDraftPurchaseOrders(bookId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").DraftPurchaseOrder[]>({
    queryKey: ["draftPurchaseOrders", bookId],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getDraftPurchaseOrders(bookId);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !actorFetching && !!bookId,
    refetchInterval: 30_000,
  });
}

export function useDismissDraftPurchaseOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      orderId,
    }: { bookId: string; orderId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.dismissDraftPurchaseOrder(bookId, orderId);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["draftPurchaseOrders", variables.bookId],
      });
    },
  });
}

// Extended Analytics Query
export function useGetAnalyticsExtended(bookId: string, timeFilter: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").AnalyticsExtended | null>({
    queryKey: ["analyticsExtended", bookId, timeFilter],
    queryFn: async () => {
      if (!actor) return null;
      const result = await actor.getAnalyticsExtended(bookId, timeFilter);
      if (result.__kind__ === "ok") return result.ok;
      throw new Error(result.err);
    },
    enabled: !!actor && !actorFetching && !!bookId,
    staleTime: 2 * 60 * 1000,
  });
}

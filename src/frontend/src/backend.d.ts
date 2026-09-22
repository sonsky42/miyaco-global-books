import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    id: string;
    name: string;
    createdAt: Time;
    createdBy: Principal;
    bookId: string;
}
export interface UserProfile {
    name: string;
    email: string;
    company: string;
    phone: string;
}
export interface AccountingBook {
    id: string;
    members: Array<Principal>;
    admin: Principal;
    adminMembers: Array<Principal>;
    name: string;
    createdAt: Time;
}
export type Time = bigint;
export interface TransactionErrorRate {
    errorRate: number;
    totalApproved: bigint;
    totalRejected: bigint;
    totalSubmitted: bigint;
}
export interface CustomerCLVItem {
    customerName: string;
    firstTransactionDate: bigint;
    totalRevenue: number;
    totalTransactions: bigint;
}
export interface CogsItem {
    grossProfit: number;
    totalCost: number;
    itemName: string;
    totalRevenue: number;
}
export interface AgingBucket {
    count: bigint;
    bucketLabel: string;
    totalAmount: number;
    transactions: Array<Transaction>;
}
export interface CustomerStatement {
    customerName: string;
    currentBalance: number;
    totalPayments: number;
    totalPurchases: number;
    transactions: Array<Transaction>;
}
export interface Transaction {
    id: string;
    customerName: string;
    sellingPriceAtSale: number;
    costPriceAtSale: number;
    paymentMethod: string;
    typeSubtype: string;
    date: Time;
    createdBy: Principal;
    bookId: string;
    productType: string;
    email: string;
    approved: boolean;
    approvalProcessed: boolean;
    currency: string;
    notes: string;
    unitsPerCarton: bigint;
    itemName: string;
    brand: string;
    phone: string;
    cartons: bigint;
    amount: number;
    pricePerCarton: number;
}
export interface InventoryItem {
    id: string;
    supplier: string;
    name: string;
    createdAt: Time;
    sellingPrice: number;
    bookId: string;
    variants: Array<string>;
    productType: string;
    highestEverQuantity: bigint;
    approved: boolean;
    locationId: string;
    unitsPerCarton: bigint;
    quantity: bigint;
    brand: string;
    costPrice: number;
}
export interface BookSettings {
    hideCostPricesFromNonAdmins: boolean;
    baseCurrency: string;
    scheduledSummaryFrequency: string;
    bookId: string;
    exchangeRate: number;
    lastSummaryDate: bigint;
}
export interface SystemSettings {
    multiStore: boolean;
    exchangeRate: number;
    companyInfo: string;
    taxRate: number;
    currencyRounding: bigint;
}
export interface ProfitByProductItem {
    grossProfit: number;
    itemName: string;
    units: bigint;
    margin: number;
}
export interface MarginTrendPoint {
    period: string;
    grossMargin: number;
    grossMarginPct: number;
}
export interface UserActivityItem {
    userName: string;
    actionCount: bigint;
    principalText: string;
    lastActionDate: bigint;
}
export type JoinRequestResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface AnalyticsExtended {
    branchComparison: Array<BranchComparisonItem>;
    approvalTurnaround: ApprovalTurnaround;
    expenseByCategory: Array<ExpenseByCategoryItem>;
    breakEven: BreakEven;
    salesVelocity: Array<SalesVelocityItem>;
    transactionErrorRate: TransactionErrorRate;
    peakPeriods: Array<PeakPeriod>;
    marginTrend: Array<MarginTrendPoint>;
    revenueForecast: Array<ForecastPoint>;
    customerCLV: Array<CustomerCLVItem>;
    profitByProduct: Array<ProfitByProductItem>;
    salesTrend: Array<SalesTrendPoint>;
    userActivity: Array<UserActivityItem>;
    stockTurnover: Array<StockTurnoverItem>;
    cogsBreakdown: Array<CogsItem>;
    repeatVsNewRatio: Array<RepeatVsNewItem>;
    deadStock: Array<DeadStockItem>;
    topCustomersByProfit: Array<TopCustomerByProfit>;
    debtAging: Array<AgingBucket>;
}
export interface TopCustomerByProfit {
    customerName: string;
    grossProfit: number;
    totalRevenue: number;
}
export interface RepeatVsNewItem {
    repeatCount: bigint;
    repeatPct: number;
    period: string;
    newCount: bigint;
}
export interface BreakEven {
    currentRevenue: number;
    surplus: number;
    totalExpenses: number;
    requiredRevenue: number;
}
export interface ForecastPoint {
    period: string;
    projected: number;
}
export interface ExpenseByCategoryItem {
    pct: number;
    category: string;
    amount: number;
}
export interface AuditLogEntry {
    id: string;
    action: string;
    actorName: string;
    bookId: string;
    timestamp: bigint;
    targetType: string;
    details: string;
    actorPrincipal: string;
    targetId: string;
}
export interface Expense {
    id: string;
    date: Time;
    createdBy: Principal;
    description: string;
    bookId: string;
    approved: boolean;
    category: string;
    amount: number;
}
export interface Customer {
    id: string;
    name: string;
    createdAt: Time;
    bookId: string;
    email: string;
    outstandingDebt: number;
    totalSpent: number;
    lastTransactionDate: Time;
    brand: string;
    phone: string;
    transactions: Array<string>;
    transactionCount: bigint;
}
export interface ApprovalTurnaround {
    fastestHours: number;
    slowestHours: number;
    avgHours: number;
    totalApproved: bigint;
    totalRejected: bigint;
}
export interface SalesVelocityItem {
    avgUnitsPerDay: number;
    itemName: string;
    totalUnits: bigint;
}
export interface DeadStockItem {
    itemName: string;
    daysSinceLastSale: bigint;
    currentQty: bigint;
}
export interface ScheduledSummary {
    id: string;
    topItemNames: Array<string>;
    grossMargin: number;
    generatedAt: bigint;
    topCustomerNames: Array<string>;
    bookId: string;
    totalExpenses: number;
    periodLabel: string;
    totalInflows: number;
    transactionCount: bigint;
}
export type MutResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface DraftPurchaseOrder {
    id: string;
    status: string;
    inventoryItemId: string;
    suggestedQuantity: bigint;
    bookId: string;
    currentQuantity: bigint;
    triggeredAt: bigint;
    itemName: string;
}
export interface BranchComparisonItem {
    totalValue: number;
    salesVolume: number;
    totalItems: bigint;
    locationName: string;
}
export interface InventoryTransfer {
    id: string;
    itemId: string;
    toLocationId: string;
    unit: string;
    bookId: string;
    fromLocationId: string;
    itemName: string;
    quantity: bigint;
    transferredAt: Time;
    transferredBy: Principal;
}
export interface SalesTrendPoint {
    revenue: number;
    period: string;
    cost: number;
    profit: number;
}
export interface StockTurnoverItem {
    turnoverRate: number;
    timesRestocked: bigint;
    itemName: string;
}
export interface PeakPeriod {
    period: string;
    rank: bigint;
    volume: number;
}
export interface JoinRequest {
    status: ApprovalStatus;
    user: Principal;
    bookId: string;
    requestedAt: Time;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomer(customer: Customer): Promise<MutResult>;
    addExpense(expense: Expense): Promise<MutResult>;
    addInventoryItem(item: InventoryItem): Promise<MutResult>;
    addTransaction(transaction: Transaction): Promise<MutResult>;
    approveExpense(expenseId: string): Promise<MutResult>;
    approveInventoryItem(itemId: string): Promise<MutResult>;
    approveJoinRequest(requestId: string, makeAdmin: boolean): Promise<JoinRequestResult>;
    approveTransaction(transactionId: string): Promise<MutResult>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changeUserRole(bookId: string, principalText: string, makeAdmin: boolean): Promise<JoinRequestResult>;
    createAccountingBook(name: string): Promise<string>;
    createLocation(bookId: string, name: string): Promise<MutResult>;
    deleteBook(bookId: string): Promise<JoinRequestResult>;
    deleteLocation(bookId: string, locationId: string): Promise<MutResult>;
    deleteTransaction(transactionId: string): Promise<MutResult>;
    dismissDraftPurchaseOrder(bookId: string, orderId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAgingReport(bookId: string): Promise<{
        __kind__: "ok";
        ok: Array<AgingBucket>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAllBooks(): Promise<Array<AccountingBook>>;
    getAllJoinRequests(): Promise<Array<JoinRequest>>;
    getAnalyticsExtended(bookId: string, timeFilter: string): Promise<{
        __kind__: "ok";
        ok: AnalyticsExtended;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAuditLog(bookId: string): Promise<{
        __kind__: "ok";
        ok: Array<AuditLogEntry>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getBookMembers(bookId: string): Promise<Array<Principal>>;
    getBookMembersWithNames(bookId: string): Promise<Array<[Principal, string, boolean]>>;
    getBookSettings(bookId: string): Promise<{
        __kind__: "ok";
        ok: BookSettings;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomerNames(bookId: string): Promise<Array<string>>;
    getCustomerStatement(bookId: string, customerName: string): Promise<{
        __kind__: "ok";
        ok: CustomerStatement;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCustomers(bookId: string): Promise<Array<Customer>>;
    getDashboardMetrics(bookId: string): Promise<{
        pendingCount: bigint;
        inventoryItems: bigint;
        customersWithDebt: bigint;
        grossMargin: bigint;
        lowStockCount: bigint;
        totalOutstandingDebt: bigint;
        recentTransactions: Array<Transaction>;
        totalInflows: bigint;
        lowStockItems: Array<[string, bigint, bigint]>;
        totalCustomers: bigint;
    }>;
    getDraftPurchaseOrders(bookId: string): Promise<{
        __kind__: "ok";
        ok: Array<DraftPurchaseOrder>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getExpenses(bookId: string): Promise<Array<Expense>>;
    getGrossMarginByPeriod(bookId: string, startTime: bigint, endTime: bigint): Promise<number>;
    getInventory(bookId: string): Promise<Array<InventoryItem>>;
    getInventoryByLocation(bookId: string, locationId: string): Promise<Array<InventoryItem>>;
    getInventoryItemNames(bookId: string): Promise<Array<string>>;
    getInventoryTransfers(bookId: string): Promise<Array<InventoryTransfer>>;
    getJoinRequestStatus(user: Principal, bookId: string): Promise<ApprovalStatus | null>;
    getLocations(bookId: string): Promise<Array<Location>>;
    getLowStockAlerts(bookId: string): Promise<Array<InventoryItem>>;
    getOrGenerateScheduledSummary(bookId: string): Promise<{
        __kind__: "ok";
        ok: ScheduledSummary;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getOutstandingCredits(bookId: string): Promise<{
        customersWithDebt: bigint;
        totalOutstanding: number;
        outstandingCredits: Array<{
            balance: number;
            debtor: string;
            totalOwed: number;
            amountPaid: number;
            paybackDate: Time;
        }>;
    }>;
    getPendingExpenses(bookId: string): Promise<Array<Expense>>;
    getPendingInventory(bookId: string): Promise<Array<InventoryItem>>;
    getPendingJoinRequests(): Promise<Array<JoinRequest>>;
    getPendingTransactions(bookId: string): Promise<Array<Transaction>>;
    getRecentTransactions(bookId: string): Promise<Array<Transaction>>;
    getSystemSettings(): Promise<SystemSettings | null>;
    getTopItemsAndCustomers(bookId: string): Promise<{
        topItems: Array<{
            sku: string;
            grossProfit: number;
            totalUnitsSold: bigint;
            brand: string;
        }>;
        topCustomers: Array<{
            name: string;
            lastSaleDate: Time;
            totalSpent: number;
        }>;
    }>;
    getTransactionStatistics(bookId: string): Promise<{
        sales: number;
        creditSales: number;
        purchases: number;
        creditPurchases: number;
    }>;
    getTransactions(bookId: string): Promise<Array<Transaction>>;
    getTransactionsByType(bookId: string, transactionType: string): Promise<Array<Transaction>>;
    getUserBooks(): Promise<Array<AccountingBook>>;
    getUserDisplayName(user: Principal): Promise<string>;
    getUserJoinRequests(): Promise<Array<[string, ApprovalStatus]>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isCallerBookAdmin(bookId: string): Promise<boolean>;
    isCallerBookMember(bookId: string): Promise<boolean>;
    isCallerPermanentAdmin(bookId: string): Promise<boolean>;
    listApprovals(): Promise<Array<[Principal, ApprovalStatus]>>;
    rejectExpense(expenseId: string): Promise<MutResult>;
    rejectInventoryItem(itemId: string): Promise<MutResult>;
    rejectJoinRequest(requestId: string): Promise<JoinRequestResult>;
    rejectTransaction(transactionId: string): Promise<MutResult>;
    removeSelfFromBook(bookId: string): Promise<JoinRequestResult>;
    removeUserFromBook(bookId: string, principalText: string): Promise<JoinRequestResult>;
    requestApproval(): Promise<void>;
    requestJoinBook(bookId: string): Promise<JoinRequestResult>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchAccountingBooks(name: string): Promise<Array<AccountingBook>>;
    searchCustomers(bookId: string, searchTerm: string): Promise<Array<Customer>>;
    searchInventory(bookId: string, searchTerm: string): Promise<Array<InventoryItem>>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    transferInventory(bookId: string, itemId: string, fromLocationId: string, toLocationId: string, quantity: bigint, unit: string): Promise<MutResult>;
    updateBookSettings(bookId: string, settings: BookSettings): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCustomer(customer: Customer): Promise<MutResult>;
    updateInventoryItem(item: InventoryItem): Promise<MutResult>;
    updateSystemSettings(settings: SystemSettings): Promise<void>;
}

import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Map "mo:core/Map";
import Debug "mo:core/Debug";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Option "mo:core/Option";
import Iter "mo:core/Iter";



actor MiyacoGlobalBooks {

  // ─── Types ────────────────────────────────────────────────────────────────

  public type UserRole = { #admin; #user; #guest };
  public type ApprovalStatus = { #approved; #pending; #rejected };

  public type UserProfile = {
    name : Text;
    phone : Text;
    email : Text;
    company : Text;
  };

  public type AccountingBook = {
    id : Text;
    name : Text;
    admin : Principal;
    members : [Principal];
    adminMembers : [Principal];
    createdAt : Time.Time;
  };

  // Location for multi-location inventory tracking
  public type Location = {
    id : Text;
    name : Text;
    bookId : Text;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  public type Transaction = {
    id : Text;
    date : Time.Time;
    customerName : Text;
    phone : Text;
    email : Text;
    brand : Text;
    productType : Text;
    typeSubtype : Text;
    itemName : Text;
    cartons : Nat;              // number of cartons in the transaction
    unitsPerCarton : Nat;       // units per carton (mirrors inventory item)
    pricePerCarton : Float;     // selling price (sales/credit-sales) or purchase price (purchases/credit-purchases) per carton
    amount : Float;             // total = pricePerCarton * cartons (kept for backward compatibility)
    // Stored at time of sale for accurate gross margin: grossMargin = (sellingPrice - costPrice) * cartons * unitsPerCarton
    sellingPriceAtSale : Float;
    costPriceAtSale : Float;
    currency : Text;
    paymentMethod : Text;
    notes : Text;
    bookId : Text;
    createdBy : Principal;
    approved : Bool;
    approvalProcessed : Bool;   // idempotency flag — true once inventory has been updated
  };

  public type Customer = {
    id : Text;
    name : Text;
    phone : Text;
    email : Text;
    brand : Text;
    transactions : [Text];
    totalSpent : Float;
    outstandingDebt : Float;
    lastTransactionDate : Time.Time;
    transactionCount : Nat;
    bookId : Text;
    createdAt : Time.Time;
  };

  public type InventoryItem = {
    id : Text;
    name : Text;
    brand : Text;
    productType : Text;
    supplier : Text;
    quantity : Nat;
    costPrice : Float;        // cost price per unit (renamed from cost)
    sellingPrice : Float;     // selling price (kept for gross margin calculations)
    unitsPerCarton : Nat;     // units per carton
    locationId : Text;        // "" = no specific location / default
    variants : [Text];
    bookId : Text;
    approved : Bool;
    highestEverQuantity : Nat;  // for 70%-sold low-stock threshold
    createdAt : Time.Time;
  };

  // Audit log for inventory transfers between locations
  public type InventoryTransfer = {
    id : Text;
    itemId : Text;
    itemName : Text;
    fromLocationId : Text;
    toLocationId : Text;
    quantity : Nat;
    unit : Text;  // "cartons" or "units"
    transferredBy : Principal;
    bookId : Text;
    transferredAt : Time.Time;
  };

  public type Expense = {
    id : Text;
    date : Time.Time;
    category : Text;
    description : Text;
    amount : Float;
    bookId : Text;
    createdBy : Principal;
    approved : Bool;
  };

  public type SystemSettings = {
    exchangeRate : Float;
    companyInfo : Text;
    taxRate : Float;
    currencyRounding : Nat;
    multiStore : Bool;
  };

  public type JoinRequest = {
    user : Principal;
    bookId : Text;
    status : ApprovalStatus;
    requestedAt : Time.Time;
  };

  public type JoinRequestResult = { #ok : Text; #err : Text };
  public type MutResult = { #ok : Text; #err : Text };

  // ─── NEW TYPES ─────────────────────────────────────────────────────────────

  public type AuditLogEntry = {
    id : Text;
    bookId : Text;
    action : Text;       // "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT"
    targetType : Text;   // "transaction", "inventory", "customer", "expense", "user", "book"
    targetId : Text;
    actorPrincipal : Text;
    actorName : Text;
    timestamp : Int;
    details : Text;
  };

  public type BookSettings = {
    bookId : Text;
    baseCurrency : Text;                    // "NGN" or "USD"
    exchangeRate : Float;                   // NGN per USD, e.g. 1600.0
    hideCostPricesFromNonAdmins : Bool;
    scheduledSummaryFrequency : Text;       // "weekly", "monthly", "never"
    lastSummaryDate : Int;
  };

  public type DraftPurchaseOrder = {
    id : Text;
    bookId : Text;
    inventoryItemId : Text;
    itemName : Text;
    currentQuantity : Nat;
    suggestedQuantity : Nat;
    triggeredAt : Int;
    status : Text;  // "draft" or "dismissed"
  };

  public type ScheduledSummary = {
    id : Text;
    bookId : Text;
    generatedAt : Int;
    periodLabel : Text;        // e.g., "Week of Apr 21-28, 2026" or "April 2026"
    totalInflows : Float;
    totalExpenses : Float;
    grossMargin : Float;
    topItemNames : [Text];
    topCustomerNames : [Text];
    transactionCount : Nat;
  };

  public type CustomerStatement = {
    customerName : Text;
    totalPurchases : Float;
    totalPayments : Float;
    currentBalance : Float;
    transactions : [Transaction];
  };

  public type AgingBucket = {
    bucketLabel : Text;  // "0-30 days", "31-60 days", "61-90 days", "90+ days"
    totalAmount : Float;
    count : Nat;
    transactions : [Transaction];
  };

  // Extended analytics types
  public type SalesTrendPoint = { period : Text; revenue : Float; cost : Float; profit : Float };
  public type PeakPeriod = { period : Text; volume : Float; rank : Nat };
  public type ForecastPoint = { period : Text; projected : Float };
  public type SalesVelocityItem = { itemName : Text; avgUnitsPerDay : Float; totalUnits : Nat };

  public type StockTurnoverItem = { itemName : Text; turnoverRate : Float; timesRestocked : Nat };
  public type DeadStockItem = { itemName : Text; daysSinceLastSale : Nat; currentQty : Nat };
  public type CogsItem = { itemName : Text; totalCost : Float; totalRevenue : Float; grossProfit : Float };
  public type BranchComparisonItem = { locationName : Text; totalItems : Nat; totalValue : Float; salesVolume : Float };

  public type CustomerCLVItem = { customerName : Text; totalRevenue : Float; totalTransactions : Nat; firstTransactionDate : Int };
  public type RepeatVsNewItem = { period : Text; repeatCount : Nat; newCount : Nat; repeatPct : Float };
  public type TopCustomerByProfit = { customerName : Text; grossProfit : Float; totalRevenue : Float };

  public type ExpenseByCategoryItem = { category : Text; amount : Float; pct : Float };
  public type MarginTrendPoint = { period : Text; grossMarginPct : Float; grossMargin : Float };
  public type BreakEven = { totalExpenses : Float; requiredRevenue : Float; currentRevenue : Float; surplus : Float };
  public type ProfitByProductItem = { itemName : Text; grossProfit : Float; units : Nat; margin : Float };

  public type ApprovalTurnaround = { avgHours : Float; fastestHours : Float; slowestHours : Float; totalApproved : Nat; totalRejected : Nat };
  public type UserActivityItem = { principalText : Text; userName : Text; actionCount : Nat; lastActionDate : Int };
  public type TransactionErrorRate = { totalSubmitted : Nat; totalApproved : Nat; totalRejected : Nat; errorRate : Float };

  public type AnalyticsExtended = {
    salesTrend : [SalesTrendPoint];
    peakPeriods : [PeakPeriod];
    revenueForecast : [ForecastPoint];
    salesVelocity : [SalesVelocityItem];
    stockTurnover : [StockTurnoverItem];
    deadStock : [DeadStockItem];
    cogsBreakdown : [CogsItem];
    branchComparison : [BranchComparisonItem];
    customerCLV : [CustomerCLVItem];
    repeatVsNewRatio : [RepeatVsNewItem];
    topCustomersByProfit : [TopCustomerByProfit];
    debtAging : [AgingBucket];
    expenseByCategory : [ExpenseByCategoryItem];
    marginTrend : [MarginTrendPoint];
    breakEven : BreakEven;
    profitByProduct : [ProfitByProductItem];
    approvalTurnaround : ApprovalTurnaround;
    userActivity : [UserActivityItem];
    transactionErrorRate : TransactionErrorRate;
  };

  // ─── Inlined AccessControl state ─────────────────────────────────────────

  let accessControlState = {
    var adminAssigned = false;
    userRoles = Map.empty<Principal, UserRole>();
  };

  // ─── Inlined UserApproval state ───────────────────────────────────────────

  let approvalState = {
    var approvalStatus = Map.empty<Principal, ApprovalStatus>();
  };

  // ─── Persistent state (mo:core Map) ──────────────────────────────────────

  var userProfiles = Map.empty<Principal, UserProfile>();
  var accountingBooks = Map.empty<Text, AccountingBook>();
  var locations = Map.empty<Text, Location>();
  var transactions = Map.empty<Text, Transaction>();
  var customers = Map.empty<Text, Customer>();
  var inventory = Map.empty<Text, InventoryItem>();
  var inventoryTransfers = Map.empty<Text, InventoryTransfer>();
  var expenses = Map.empty<Text, Expense>();
  var systemSettings = Map.empty<Text, SystemSettings>();
  var userBooks = Map.empty<Principal, [Text]>();
  var joinRequests = Map.empty<Text, JoinRequest>();

  // ─── NEW STABLE VARIABLES ─────────────────────────────────────────────────

  var auditLog = Map.empty<Text, [AuditLogEntry]>();
  var bookSettings = Map.empty<Text, BookSettings>();
  var draftPurchaseOrders = Map.empty<Text, [DraftPurchaseOrder]>();
  var scheduledSummaries = Map.empty<Text, [ScheduledSummary]>();
  var customerPhotos = Map.empty<Text, Text>();

  // Rebuild totals from posted sales so profiles remain consistent with the ledger.
  func customerLedger(bookId : Text) : [Customer] {
    let result = Map.empty<Text, Customer>();
    for (c in customers.values()) {
      if (c.bookId == bookId) {
        result.add(Text.trim(c.name, #char ' ').toLower(), { c with transactions = []; totalSpent = 0.0; outstandingDebt = 0.0; transactionCount = 0; lastTransactionDate = 0 });
      };
    };
    for (tx in transactions.values()) {
      if (tx.bookId == bookId and tx.approved and (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales")) {
        let name = Text.trim(tx.customerName, #char ' ');
        if (name != "") {
          let key = name.toLower();
          let c : Customer = switch (result.get(key)) {
            case (?existing) { existing };
            case null { { id = bookId # "-customer-" # key; name; phone = ""; email = ""; brand = ""; transactions = []; totalSpent = 0.0; outstandingDebt = 0.0; lastTransactionDate = 0; transactionCount = 0; bookId; createdAt = tx.date } };
          };
          result.add(key, { c with
            transactions = c.transactions.concat([tx.id]);
            totalSpent = c.totalSpent + tx.amount;
            outstandingDebt = c.outstandingDebt + (if (tx.typeSubtype == "Credit Sales") { tx.amount } else { 0.0 });
            transactionCount = c.transactionCount + 1;
            lastTransactionDate = Int.max(c.lastTransactionDate, tx.date);
            phone = if (tx.date >= c.lastTransactionDate and tx.phone != "") { tx.phone } else { c.phone };
            email = if (tx.date >= c.lastTransactionDate and tx.email != "") { tx.email } else { c.email };
          });
        };
      };
    };
    result.values().toArray();
  };

  public query ({ caller }) func getCustomerPhoto(bookId : Text, name : Text) : async Text {
    if (not isBookMember(caller, bookId)) { Runtime.trap("Book membership required") };
    customerPhotos.get(bookId # "|" # Text.trim(name, #char ' ').toLower()).get("");
  };

  public shared ({ caller }) func setCustomerPhoto(bookId : Text, name : Text, photo : Text) : async () {
    if (not isBookAdminMember(caller, bookId)) { Runtime.trap("Book admin access required") };
    if (photo.size() > 280_000) { Runtime.trap("Photo must be smaller than 200 KB") };
    if (photo != "" and not photo.startsWith(#text "data:image/jpeg;base64,") and not photo.startsWith(#text "data:image/png;base64,") and not photo.startsWith(#text "data:image/webp;base64,")) { Runtime.trap("Choose a JPEG, PNG or WebP photo") };
    customerPhotos.add(bookId # "|" # Text.trim(name, #char ' ').toLower(), photo);
  };

  // ─── AccessControl helpers ────────────────────────────────────────────────

  func acInitialize(caller : Principal) {
    if (caller.isAnonymous()) { Runtime.trap("Sign in before initializing access") };
    if (not accessControlState.adminAssigned) {
      accessControlState.userRoles.add(caller, #admin);
      accessControlState.adminAssigned := true;
      Debug.print("AccessControl: First admin assigned: " # caller.toText());
    };
  };

  func acGetRole(user : Principal) : UserRole {
    switch (accessControlState.userRoles.get(user)) {
      case (?role) { role };
      case null { #guest };
    };
  };

  func acIsAdmin(user : Principal) : Bool {
    switch (acGetRole(user)) {
      case (#admin) { true };
      case (_) { false };
    };
  };

  func acHasPermission(user : Principal, required : UserRole) : Bool {
    switch (required) {
      case (#admin) { acIsAdmin(user) };
      case (#user) {
        switch (acGetRole(user)) {
          case (#admin) { true };
          case (#user) { true };
          case (#guest) { false };
        };
      };
      case (#guest) { true };
    };
  };

  func acAssignRole(caller : Principal, target : Principal, role : UserRole) {
    if (not acIsAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    accessControlState.userRoles.add(target, role);
    Debug.print("AccessControl: Role assigned - user: " # target.toText() # ", role: " # debug_show(role));
  };

  // ─── UserApproval helpers ─────────────────────────────────────────────────

  func isApproved(user : Principal) : Bool {
    switch (approvalState.approvalStatus.get(user)) {
      case (? #approved) { true };
      case (_) { false };
    };
  };

  func setApprovalInternal(user : Principal, status : ApprovalStatus) {
    approvalState.approvalStatus.add(user, status);
    Debug.print("UserApproval: Approval set for " # user.toText() # " -> " # debug_show(status));
  };

  // ─── Book membership helpers ──────────────────────────────────────────────

  func isBookMember(user : Principal, bookId : Text) : Bool {
    switch (accountingBooks.get(bookId)) {
      case null { false };
      case (?book) {
        book.members.find<Principal>(func(m) { Principal.equal(m, user) }) != null;
      };
    };
  };

  func isBookAdmin(caller : Principal, bookId : Text) : Bool {
    switch (accountingBooks.get(bookId)) {
      case null { false };
      case (?book) { Principal.equal(book.admin, caller) };
    };
  };

  func isBookAdminMember(caller : Principal, bookId : Text) : Bool {
    switch (accountingBooks.get(bookId)) {
      case null { false };
      case (?book) {
        // Permanent admin (book creator) is always an admin member
        Principal.equal(book.admin, caller) or
        book.adminMembers.find<Principal>(func(a) { Principal.equal(a, caller) }) != null;
      };
    };
  };

  func hasPendingJoinRequest(user : Principal, bookId : Text) : Bool {
    let requestId = user.toText() # "-" # bookId;
    switch (joinRequests.get(requestId)) {
      case null { false };
      case (?_) { true };
    };
  };

  // ─── Audit logging helper ─────────────────────────────────────────────────

  func logAudit(bookId : Text, action : Text, targetType : Text, targetId : Text, actorPrincipal : Principal, actorName : Text, details : Text) {
    let entry : AuditLogEntry = {
      id = actorPrincipal.toText() # "-" # Time.now().toText();
      bookId;
      action;
      targetType;
      targetId;
      actorPrincipal = actorPrincipal.toText();
      actorName;
      timestamp = Time.now();
      details;
    };
    let existing = auditLog.get(bookId).get([]);
    let updated = existing.concat([entry]);
    auditLog.add(bookId, updated);
    Debug.print("AuditLog: " # action # " " # targetType # " " # targetId # " by " # actorPrincipal.toText());
  };

  // ─── Draft purchase order helper ──────────────────────────────────────────

  func checkAndCreateDraftPurchaseOrder(item : InventoryItem) {
    if (item.highestEverQuantity == 0) { return };
    let threshold = item.highestEverQuantity * 30 / 100;
    let isLowStock = item.quantity <= threshold or item.quantity <= 2;
    if (not isLowStock) { return };

    // Check if there's already a draft order for this item
    let existing = draftPurchaseOrders.get(item.bookId).get([]);
    let hasDraft = existing.find(func(o : DraftPurchaseOrder) : Bool {
      o.inventoryItemId == item.id and o.status == "draft"
    }) != null;

    if (hasDraft) { return };

    let suggestedQty = if (item.highestEverQuantity > 10) { item.highestEverQuantity } else { 10 };
    let orderId = item.bookId # "-dpo-" # item.id # "-" # Time.now().toText();
    let order : DraftPurchaseOrder = {
      id = orderId;
      bookId = item.bookId;
      inventoryItemId = item.id;
      itemName = item.name;
      currentQuantity = item.quantity;
      suggestedQuantity = suggestedQty;
      triggeredAt = Time.now();
      status = "draft";
    };
    let updated = existing.concat([order]);
    draftPurchaseOrders.add(item.bookId, updated);
    Debug.print("DraftPurchaseOrder created for low-stock item: " # item.name);
  };

  // ─── General helpers ──────────────────────────────────────────────────────

  // Case-insensitive substring match
  func textContainsIgnoreCase(haystack : Text, needle : Text) : Bool {
    haystack.toLower().contains(#text(needle.toLower()));
  };

  // Helper to get actor name
  func getActorName(p : Principal) : Text {
    switch (userProfiles.get(p)) {
      case null { p.toText() };
      case (?prof) { prof.name };
    };
  };

  // Auto-create or update customer profile when a sale/credit-sale transaction is recorded
  func upsertCustomerProfile(tx : Transaction) {
    if (tx.customerName == "") { return };
    let normalizedName = tx.customerName.toLower();

    // Find existing customer in the same book with the same name (case-insensitive)
    let existingEntry = customers.entries()
      .find(func((_, c) : (Text, Customer)) : Bool {
        c.bookId == tx.bookId and c.name.toLower() == normalizedName
      });

    switch (existingEntry) {
      case null {
        // Auto-create new customer profile
        let customerId = tx.bookId # "-cust-" # normalizedName # "-" # debug_show(Time.now());
        let isCredit = tx.typeSubtype == "Credit Sales";
        let newCustomer : Customer = {
          id = customerId;
          name = tx.customerName;
          phone = tx.phone;
          email = tx.email;
          brand = tx.brand;
          transactions = [tx.id];
          totalSpent = tx.amount;
          outstandingDebt = if (isCredit) { tx.amount } else { 0.0 };
          lastTransactionDate = tx.date;
          transactionCount = 1;
          bookId = tx.bookId;
          createdAt = Time.now();
        };
        customers.add(customerId, newCustomer);
        Debug.print("Auto-created customer profile: " # tx.customerName);
      };
      case (?(existingId, existingCust)) {
        let isCredit = tx.typeSubtype == "Credit Sales";
        let updatedTxns = existingCust.transactions.concat([tx.id]);
        let newLastDate = if (tx.date > existingCust.lastTransactionDate) { tx.date } else { existingCust.lastTransactionDate };
        let updatedCustomer : Customer = {
          existingCust with
          transactions = updatedTxns;
          totalSpent = existingCust.totalSpent + tx.amount;
          phone = if (tx.phone != "") { tx.phone } else { existingCust.phone };
          email = if (tx.email != "") { tx.email } else { existingCust.email };
          brand = if (tx.brand != "") { tx.brand } else { existingCust.brand };
          outstandingDebt = existingCust.outstandingDebt + (if (isCredit) { tx.amount } else { 0.0 });
          lastTransactionDate = newLastDate;
          transactionCount = existingCust.transactionCount + 1;
        };
        customers.add(existingId, updatedCustomer);
        Debug.print("Updated customer profile: " # tx.customerName);
      };
    };
  };

  // ─── Access control public API ────────────────────────────────────────────

  public shared ({ caller }) func initializeAccessControl() : async () {
    Debug.print("initializeAccessControl called by: " # caller.toText());
    acInitialize(caller);
  };

  public query ({ caller }) func getCallerUserRole() : async UserRole {
    acGetRole(caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : UserRole) : async () {
    Debug.print("assignCallerUserRole - caller: " # caller.toText() # ", user: " # user.toText());
    acAssignRole(caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    acIsAdmin(caller);
  };

  // Check if caller is a book admin (member of adminMembers array) — useful for frontend
  public query ({ caller }) func isCallerBookAdmin(bookId : Text) : async Bool {
    isBookAdminMember(caller, bookId)
  };

  // Check if caller is the permanent admin (book creator) of a book
  public query ({ caller }) func isCallerPermanentAdmin(bookId : Text) : async Bool {
    isBookAdmin(caller, bookId)
  };

  // Check if caller is a member of a book
  public query ({ caller }) func isCallerBookMember(bookId : Text) : async Bool {
    isBookMember(caller, bookId)
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    acIsAdmin(caller) or isApproved(caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not acHasPermission(caller, #user)) {
      Runtime.trap("Unauthorized: Only users can request approval");
    };
    approvalState.approvalStatus.add(caller, #pending);
    Debug.print("Approval requested for: " # caller.toText());
  };

  public shared ({ caller }) func setApproval(user : Principal, status : ApprovalStatus) : async () {
    if (not acIsAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can set approval status");
    };
    setApprovalInternal(user, status);
  };

  public query ({ caller }) func listApprovals() : async [(Principal, ApprovalStatus)] {
    if (not acIsAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list approvals");
    };
    approvalState.approvalStatus.entries().toArray();
  };

  // ─── User profile public API ──────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not acIsAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous users cannot save profiles");
    };
    userProfiles.add(caller, profile);
    Debug.print("Profile saved for: " # caller.toText());
  };

  // ─── Accounting book public API ───────────────────────────────────────────

  public shared ({ caller }) func createAccountingBook(name : Text) : async Text {
    Debug.print("createAccountingBook called by: " # caller.toText() # ", name: " # name);

    // Any authenticated (non-anonymous) user can create a book - no role check required
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous users cannot create accounting books");
    };

    let bookId = name # "-" # Time.now().toText();
    let book : AccountingBook = {
      id = bookId;
      name;
      admin = caller;
      members = [caller];
      adminMembers = [caller];
      createdAt = Time.now();
    };
    accountingBooks.add(bookId, book);

    let currentBooks = switch (userBooks.get(caller)) {
      case null { [] };
      case (?books) { books };
    };
    userBooks.add(caller, currentBooks.concat<Text>([bookId]));

    logAudit(bookId, "CREATE", "book", bookId, caller, getActorName(caller), "Created accounting book: " # name);
    Debug.print("Accounting book created: " # bookId);
    bookId;
  };

  public query func searchAccountingBooks(name : Text) : async [AccountingBook] {
    accountingBooks.values()
      .filter(func(book : AccountingBook) : Bool {
        book.name.contains(#text name)
      })
      .toArray();
  };

  public shared ({ caller }) func requestJoinBook(bookId : Text) : async JoinRequestResult {
    Debug.print("requestJoinBook - caller: " # caller.toText() # ", bookId: " # bookId);

    // ANY authenticated (non-anonymous) user can request to join any book
    if (caller.isAnonymous()) {
      return #err("Anonymous users cannot request to join books");
    };

    switch (accountingBooks.get(bookId)) {
      case null {
        Debug.print("ERROR: Book not found: " # bookId);
        return #err("Book not found");
      };
      case (?_book) {
        if (isBookMember(caller, bookId)) {
          Debug.print("requestJoinBook: caller is already a member");
          return #err("You are already a member of this book");
        };
        if (hasPendingJoinRequest(caller, bookId)) {
          Debug.print("requestJoinBook: caller already has pending request");
          return #err("You already have a pending join request for this book");
        };

        let requestId = caller.toText() # "-" # bookId;
        let joinRequest : JoinRequest = {
          user = caller;
          bookId;
          status = #pending;
          requestedAt = Time.now();
        };
        joinRequests.add(requestId, joinRequest);

        Debug.print("Join request created: " # requestId);
        #ok("Join request submitted successfully");
      };
    };
  };

  public shared ({ caller }) func approveJoinRequest(requestId : Text, makeAdmin : Bool) : async JoinRequestResult {
    Debug.print("approveJoinRequest - caller: " # caller.toText() # ", requestId: " # requestId);

    switch (joinRequests.get(requestId)) {
      case null {
        Debug.print("ERROR: Join request not found: " # requestId);
        return #err("Join request not found");
      };
      case (?request) {
        Debug.print("approveJoinRequest - bookId: " # request.bookId # ", user: " # request.user.toText());

        if (not isBookAdminMember(caller, request.bookId)) {
          Debug.print("ERROR: Unauthorized approval - caller " # caller.toText() # " is not admin of book " # request.bookId);
          return #err("Unauthorized: Only book admins can approve join requests");
        };

        switch (accountingBooks.get(request.bookId)) {
          case null {
            joinRequests.remove(requestId);
            return #err("Book not found");
          };
          case (?book) {
            if (isBookMember(request.user, request.bookId)) {
              joinRequests.remove(requestId);
              Debug.print("User is already a member, removed stale request");
              return #err("User is already a member of this book");
            };

            // Use Principal directly (it was stored correctly from requestJoinBook)
            let approvedUser : Principal = request.user;

            let updatedAdminMembers = if (makeAdmin) {
              book.adminMembers.concat([approvedUser]);
            } else {
              book.adminMembers;
            };

            accountingBooks.add(request.bookId, {
              book with
              members = book.members.concat<Principal>([approvedUser]);
              adminMembers = updatedAdminMembers;
            });

            // Add book to user's book list
            let currentBooks = switch (userBooks.get(approvedUser)) {
              case null { [] };
              case (?books) { books };
            };
            // Avoid duplicates
            let alreadyHasBook = currentBooks.find(func(id : Text) : Bool { id == request.bookId }) != null;
            if (not alreadyHasBook) {
              userBooks.add(approvedUser, currentBooks.concat<Text>([request.bookId]));
            };

            // Remove the join request
            joinRequests.remove(requestId);

            logAudit(request.bookId, "APPROVE", "user", approvedUser.toText(), caller, getActorName(caller),
              "Approved join request for user: " # approvedUser.toText());
            Debug.print("Join request approved: " # requestId # " for user: " # approvedUser.toText());
            #ok("Join request approved successfully");
          };
        };
      };
    };
  };

  public shared ({ caller }) func rejectJoinRequest(requestId : Text) : async JoinRequestResult {
    Debug.print("rejectJoinRequest - caller: " # caller.toText() # ", requestId: " # requestId);

    switch (joinRequests.get(requestId)) {
      case null {
        Debug.print("ERROR: Join request not found: " # requestId);
        return #err("Join request not found");
      };
      case (?request) {
        Debug.print("rejectJoinRequest - bookId: " # request.bookId # ", user: " # request.user.toText());

        if (not isBookAdminMember(caller, request.bookId)) {
          Debug.print("ERROR: Unauthorized rejection - caller is not admin");
          return #err("Unauthorized: Only book admins can reject join requests");
        };

        joinRequests.remove(requestId);

        logAudit(request.bookId, "REJECT", "user", request.user.toText(), caller, getActorName(caller),
          "Rejected join request for user: " # request.user.toText());
        Debug.print("Join request rejected: " # requestId);
        #ok("Join request rejected successfully");
      };
    };
  };

  public query ({ caller }) func getPendingJoinRequests() : async [JoinRequest] {
    Debug.print("getPendingJoinRequests - caller: " # caller.toText());

    // Return pending requests for all books where the caller is an admin member
    joinRequests.values()
      .filter(func(req : JoinRequest) : Bool {
        isBookAdminMember(caller, req.bookId) and req.status == #pending
      })
      .toArray();
  };

  public query func getAllBooks() : async [AccountingBook] {
    Debug.print("getAllBooks called");
    accountingBooks.values().toArray();
  };

  public query ({ caller }) func getUserBooks() : async [AccountingBook] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot view books");
    };

    switch (userBooks.get(caller)) {
      case null { [] };
      case (?bookIds) {
        bookIds.filterMap<Text, AccountingBook>(func(bookId) {
          accountingBooks.get(bookId)
        });
      };
    };
  };

  public query ({ caller }) func getAllJoinRequests() : async [JoinRequest] {
    joinRequests.values()
      .filter(func(req : JoinRequest) : Bool {
        isBookAdminMember(caller, req.bookId)
      })
      .toArray();
  };

  public query func getJoinRequestStatus(user : Principal, bookId : Text) : async ?ApprovalStatus {
    let found = joinRequests.values().find(func(req : JoinRequest) : Bool {
      Principal.equal(req.user, user) and req.bookId == bookId
    });
    switch (found) {
      case null { null };
      case (?req) { ?req.status };
    };
  };

  public query ({ caller }) func getUserJoinRequests() : async [(Text, ApprovalStatus)] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot view join requests");
    };

    let bookIds = switch (userBooks.get(caller)) {
      case null { [] };
      case (?books) { books };
    };

    bookIds.map<Text, (Text, ApprovalStatus)>(func(bookId) {
      let status : ApprovalStatus = switch (accountingBooks.get(bookId)) {
        case null { #rejected };
        case (?book) {
          if (book.members.find<Principal>(func(m) { Principal.equal(m, caller) }) != null) {
            #approved;
          } else { #pending };
        };
      };
      (bookId, status);
    });
  };

  private func processTransactionInventory(tx : Transaction) : { #ok : Float; #err : Text } {
    if (tx.cartons == 0 or tx.unitsPerCarton == 0) { return #err("Invalid transaction quantity") };
    let matches = inventory.values().filter(func(item : InventoryItem) : Bool {
      item.bookId == tx.bookId and item.name.toLower() == tx.itemName.toLower() and item.approved
    }).toArray();
    if (matches.size() > 1) { return #err("More than one inventory item has this name. Give each part and location a unique item name before posting") };
    let isSale = tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales";
    let isPurchase = tx.typeSubtype == "Purchases" or tx.typeSubtype == "Credit Purchases";
    if (isSale) {
      var foundKey : ?Text = null;
      var foundItem : ?InventoryItem = null;
      for ((k, item) in inventory.entries()) {
        if (item.bookId == tx.bookId and item.name.toLower() == tx.itemName.toLower() and item.approved) {
          foundKey := ?k;
          foundItem := ?item;
        };
      };
      switch (foundKey, foundItem) {
        case (?k, ?item) {
          let unitsToDeduct = tx.cartons * tx.unitsPerCarton;
          if (item.quantity < unitsToDeduct) {
            return #err("Insufficient stock: " # item.quantity.toText() # " units for " # tx.itemName);
          };
          let newQty = item.quantity - unitsToDeduct;
          inventory.add(k, { item with quantity = newQty });
          Debug.print("SALE deduct: " # tx.itemName # " " # item.quantity.toText() # " -> " # newQty.toText());
          checkAndCreateDraftPurchaseOrder({ item with quantity = newQty });
          return #ok(item.costPrice);
        };
        case _ { return #err("Item not found in inventory: " # tx.itemName) };
      };
    } else if (isPurchase) {
      var foundKey : ?Text = null;
      var foundItem : ?InventoryItem = null;
      for ((k, item) in inventory.entries()) {
        if (item.bookId == tx.bookId and item.name.toLower() == tx.itemName.toLower() and item.approved) {
          foundKey := ?k;
          foundItem := ?item;
        };
      };
      let unitsToAdd = tx.cartons * tx.unitsPerCarton;
      switch (foundKey, foundItem) {
        case (?k, ?item) {
          let newQty = item.quantity + unitsToAdd;
          let newHigh = if (newQty > item.highestEverQuantity) { newQty } else { item.highestEverQuantity };
          let unitCost = tx.pricePerCarton / tx.unitsPerCarton.toFloat();
          let averageCost = (item.costPrice * item.quantity.toFloat() + unitCost * unitsToAdd.toFloat()) / newQty.toFloat();
          inventory.add(k, { item with quantity = newQty; highestEverQuantity = newHigh; costPrice = averageCost });
          Debug.print("PURCHASE add: " # tx.itemName # " +" # unitsToAdd.toText());
          return #ok(item.costPrice);
        };
        case _ {
          let newId = tx.bookId # "-auto-" # tx.itemName # "-" # Time.now().toText();
          let upc : Nat = if (tx.unitsPerCarton > 0) { tx.unitsPerCarton } else { 1 };
          inventory.add(newId, { id = newId; name = tx.itemName; brand = tx.brand; productType = tx.productType; supplier = tx.customerName; quantity = unitsToAdd; costPrice = tx.pricePerCarton / upc.toFloat(); sellingPrice = 0.0; unitsPerCarton = upc; locationId = ""; variants = ([] : [Text]); bookId = tx.bookId; approved = true; highestEverQuantity = unitsToAdd; createdAt = Time.now() });
          Debug.print("PURCHASE new item: " # tx.itemName # " +" # unitsToAdd.toText());
          return #ok(tx.pricePerCarton);
        };
      };
    };
    #ok(0.0);
  };

  // ─── Transaction public API ───────────────────────────────────────────────

  public shared ({ caller }) func addTransaction(transaction : Transaction) : async MutResult {
    Debug.print("addTransaction - caller: " # caller.toText() # ", bookId: " # transaction.bookId);

    if (not isBookMember(caller, transaction.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, transaction.bookId);

    if (transactions.get(transaction.id) != null) { return #err("Transaction already exists") };
    if (transaction.cartons == 0 or transaction.unitsPerCarton == 0) { return #err("Quantity and units per carton must be positive") };
    if (not (transaction.pricePerCarton >= 0.0 and transaction.pricePerCarton < 1e15)) { return #err("Enter a valid price") };
    if (transaction.typeSubtype != "Sales" and transaction.typeSubtype != "Credit Sales" and transaction.typeSubtype != "Purchases" and transaction.typeSubtype != "Credit Purchases") { return #err("Unsupported transaction type") };
    if (Text.trim(transaction.customerName, #char ' ') == "") { return #err("Enter the customer or supplier name") };
    if (transaction.currency != "NGN" and transaction.currency != "USD") { return #err("Unsupported currency") };
    let rate = if (transaction.currency == "USD") {
      let configured = switch (bookSettings.get(transaction.bookId)) {
        case (?settings) { settings.exchangeRate };
        case null { switch (systemSettings.get("default")) { case (?settings) { settings.exchangeRate }; case null { 0.0 } } };
      };
      if (not (configured > 0.0 and configured < 1e9)) { return #err("Set the book's NGN per USD exchange rate before recording dollar transactions") };
      configured;
    } else { 1.0 };
    let priceInNaira = transaction.pricePerCarton * rate;

    // For sales/credit-sales: validate inventory exists and has sufficient stock
    if (transaction.typeSubtype == "Sales" or transaction.typeSubtype == "Credit Sales") {
      let invEntry = inventory.entries().find(func((_, item) : (Text, InventoryItem)) : Bool {
        item.bookId == transaction.bookId and
        item.name.toLower() == transaction.itemName.toLower() and
        item.approved
      });
      switch (invEntry) {
        case null {
          return #err("Item not found in inventory: " # transaction.itemName);
        };
        case (?(_, item)) {
          // Quantity in inventory is stored as total units; convert transaction cartons to units
          let cartonQty = item.quantity / transaction.unitsPerCarton;
          if (cartonQty < transaction.cartons) {
            return #err("Insufficient stock: only " # cartonQty.toText() # " cartons available for " # transaction.itemName);
          };
        };
      };
    };

    let totalAmount = transaction.cartons.toFloat() * priceInNaira;
    let finalTx : Transaction = {
      transaction with
      approved = isAdmin;
      approvalProcessed = false;
      createdBy = caller;
      amount = totalAmount;
      customerName = Text.trim(transaction.customerName, #char ' ');
      sellingPriceAtSale = priceInNaira / transaction.unitsPerCarton.toFloat();
      costPriceAtSale = 0.0;
      cartons = transaction.cartons;
      unitsPerCarton = transaction.unitsPerCarton;
      pricePerCarton = priceInNaira;
      currency = "NGN";
      notes = transaction.notes # (if (transaction.currency == "USD") { " [Original USD/carton: " # transaction.pricePerCarton.toText() # "; NGN/USD: " # rate.toText() # "]" } else { "" });
    };
    // Auto-track customer and process inventory for admin-approved transactions
    if (isAdmin) {
      let cost = switch (processTransactionInventory(finalTx)) {
        case (#err(message)) { return #err(message) };
        case (#ok(value)) { value };
      };
      let processedTx = { finalTx with costPriceAtSale = cost; approvalProcessed = true; approved = true };
      transactions.add(transaction.id, processedTx);
      if (transaction.typeSubtype == "Sales" or transaction.typeSubtype == "Credit Sales") {
        upsertCustomerProfile(processedTx);
      };
      logAudit(transaction.bookId, "CREATE", "transaction", transaction.id, caller, getActorName(caller), "Recorded " # transaction.typeSubtype);
      Debug.print("Transaction added and approved by admin: " # transaction.id);
      #ok("Transaction added successfully");
    } else {
      transactions.add(transaction.id, finalTx);
      logAudit(transaction.bookId, "CREATE", "transaction", transaction.id, caller, getActorName(caller), "Submitted " # transaction.typeSubtype);
      Debug.print("Transaction pending approval: " # transaction.id);
      #ok("Transaction submitted for approval");
    };
  };

  public shared ({ caller }) func approveTransaction(transactionId : Text) : async MutResult {
    Debug.print("approveTransaction - caller: " # caller.toText() # ", id: " # transactionId);

    switch (transactions.get(transactionId)) {
      case null { return #err("Transaction not found") };
      case (?tx) {
        if (not isBookAdminMember(caller, tx.bookId)) {
          return #err("Unauthorized: Only book admins can approve transactions");
        };
        if (tx.approvalProcessed) {
          return #err("Transaction already processed");
        };
        // For sales/credit-sales: validate inventory before approving
        if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
          let invEntry = inventory.entries().find(func((_, item) : (Text, InventoryItem)) : Bool {
            item.bookId == tx.bookId and
            item.name.toLower() == tx.itemName.toLower() and
            item.approved
          });
          switch (invEntry) {
            case null {
              return #err("Item not found in inventory: " # tx.itemName);
            };
            case (?(_, item)) {
              if (tx.unitsPerCarton == 0 or tx.cartons == 0) { return #err("Invalid transaction quantity") };
              let cartonQty = item.quantity / tx.unitsPerCarton;
              if (cartonQty < tx.cartons) {
                return #err("Insufficient stock: only " # cartonQty.toText() # " cartons available for " # tx.itemName);
              };
            };
          };
        };

        let invResult = processTransactionInventory(tx);
        let cost = switch (invResult) {
          case (#err(msg)) { return #err(msg) };
          case (#ok(value)) { value };
        };

        let approvedTx = { tx with approved = true; approvalProcessed = true; costPriceAtSale = cost };
        transactions.add(transactionId, approvedTx);

        if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
          upsertCustomerProfile(approvedTx);
        };

        logAudit(tx.bookId, "APPROVE", "transaction", transactionId, caller, getActorName(caller),
          "Approved " # tx.typeSubtype # " transaction for " # tx.customerName);
        Debug.print("Transaction approved: " # transactionId);
        #ok("Transaction approved successfully");
      };
    };
  };

  public shared ({ caller }) func rejectTransaction(transactionId : Text) : async MutResult {
    Debug.print("rejectTransaction - caller: " # caller.toText() # ", id: " # transactionId);

    switch (transactions.get(transactionId)) {
      case null { return #err("Transaction not found") };
      case (?tx) {
        if (not isBookAdminMember(caller, tx.bookId)) {
          return #err("Unauthorized: Only book admins can reject transactions");
        };
        if (tx.approved or tx.approvalProcessed) { return #err("Approved transactions cannot be rejected") };
        transactions.remove(transactionId);
        logAudit(tx.bookId, "REJECT", "transaction", transactionId, caller, getActorName(caller),
          "Rejected " # tx.typeSubtype # " transaction for " # tx.customerName);
        Debug.print("Transaction rejected: " # transactionId);
        #ok("Transaction rejected successfully");
      };
    };
  };

  public shared ({ caller }) func deleteTransaction(transactionId : Text) : async MutResult {
    Debug.print("deleteTransaction - caller: " # caller.toText() # ", id: " # transactionId);

    switch (transactions.get(transactionId)) {
      case null { return #err("Transaction not found") };
      case (?tx) {
        if (not isBookAdminMember(caller, tx.bookId)) {
          return #err("Unauthorized: Only book admins can delete transactions");
        };
        if (tx.approved or tx.approvalProcessed) { return #err("Posted transactions require a reversal to preserve stock and customer balances; deletion is disabled") };
        transactions.remove(transactionId);
        logAudit(tx.bookId, "DELETE", "transaction", transactionId, caller, getActorName(caller),
          "Deleted " # tx.typeSubtype # " transaction for " # tx.customerName);
        Debug.print("Transaction deleted: " # transactionId);
        #ok("Transaction deleted successfully");
      };
    };
  };

  public query ({ caller }) func getTransactions(bookId : Text) : async [Transaction] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and tx.approved
      })
      .toArray();
  };

  public query ({ caller }) func getPendingTransactions(bookId : Text) : async [Transaction] {
    if (not isBookAdminMember(caller, bookId)) {
      Runtime.trap("Unauthorized: Only book admins can view pending transactions");
    };

    transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and not tx.approved
      })
      .toArray();
  };

  public query ({ caller }) func getRecentTransactions(bookId : Text) : async [Transaction] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    let bookTxs = transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and tx.approved
      })
      .toArray();

    let sorted = bookTxs.sort(func(a, b) {
      if (a.date > b.date) { #less } else if (a.date < b.date) { #greater } else { #equal }
    });

    let count = if (sorted.size() > 20) { 20 } else { sorted.size() };
    Array.tabulate<Transaction>(count, func(i) { sorted[i] });
  };

  public query ({ caller }) func getTransactionsByType(bookId : Text, transactionType : Text) : async [Transaction] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and tx.typeSubtype == transactionType and tx.approved
      })
      .toArray();
  };

  public query ({ caller }) func getTransactionStatistics(bookId : Text) : async {
    sales : Float;
    creditSales : Float;
    purchases : Float;
    creditPurchases : Float;
  } {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    var sales = 0.0;
    var creditSales = 0.0;
    var purchases = 0.0;
    var creditPurchases = 0.0;

    for ((_, tx) in transactions.entries()) {
      if (tx.bookId == bookId and tx.approved) {
        switch (tx.typeSubtype) {
          case "Sales" { sales += tx.amount };
          case "Credit Sales" { creditSales += tx.amount };
          case "Purchases" { purchases += tx.amount };
          case "Credit Purchases" { creditPurchases += tx.amount };
          case _ {};
        };
      };
    };

    { sales; creditSales; purchases; creditPurchases };
  };

  // ─── Customer public API ──────────────────────────────────────────────────

  public shared ({ caller }) func addCustomer(customer : Customer) : async MutResult {
    Debug.print("addCustomer - caller: " # caller.toText());

    if (not isBookMember(caller, customer.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };

    if (customers.get(customer.id) != null) { return #err("Customer already exists") };
    customers.add(customer.id, customer);
    logAudit(customer.bookId, "CREATE", "customer", customer.id, caller, getActorName(caller),
      "Added customer: " # customer.name);
    Debug.print("Customer added: " # customer.id);
    #ok("Customer added successfully");
  };

  public shared ({ caller }) func updateCustomer(customer : Customer) : async MutResult {
    Debug.print("updateCustomer - caller: " # caller.toText());

    if (not isBookMember(caller, customer.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };

    switch (customers.get(customer.id)) {
      case null { return #err("Customer not found") };
      case (?existing) {
        if (existing.bookId != customer.bookId) { return #err("Customer does not belong to this book") };
        customers.add(customer.id, { existing with phone = customer.phone; email = customer.email; brand = customer.brand });
      };
    };
    Debug.print("Customer updated: " # customer.id);
    #ok("Customer updated successfully");
  };

  public query ({ caller }) func getCustomers(bookId : Text) : async [Customer] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    customerLedger(bookId);
  };

  // Returns all unique customer names in a book (for autocomplete)
  public query ({ caller }) func getCustomerNames(bookId : Text) : async [Text] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    customerLedger(bookId).map(func(c : Customer) : Text { c.name });
  };
  public query ({ caller }) func getInventoryItemNames(bookId : Text) : async [Text] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };
    inventory.values()
      .filter(func(item : InventoryItem) : Bool { item.bookId == bookId and item.quantity > 0 and item.approved })
      .map<InventoryItem, Text>(func(item) { item.name })
      .toArray();
  };

  // Case-insensitive search on customer name, phone, email, brand
  public query ({ caller }) func searchCustomers(bookId : Text, searchTerm : Text) : async [Customer] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    if (searchTerm == "") {
      return customers.values()
        .filter(func(c : Customer) : Bool { c.bookId == bookId })
        .toArray();
    };

    customers.values()
      .filter(func(c : Customer) : Bool {
        c.bookId == bookId and (
          textContainsIgnoreCase(c.name, searchTerm) or
          textContainsIgnoreCase(c.phone, searchTerm) or
          textContainsIgnoreCase(c.email, searchTerm) or
          textContainsIgnoreCase(c.brand, searchTerm)
        )
      })
      .toArray();
  };

  // ─── Inventory public API ─────────────────────────────────────────────────

  public shared ({ caller }) func addInventoryItem(item : InventoryItem) : async MutResult {
    Debug.print("addInventoryItem - caller: " # caller.toText() # ", bookId: " # item.bookId);

    if (not isBookMember(caller, item.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, item.bookId);
    if (inventory.get(item.id) != null) { return #err("Inventory item already exists") };
    if (item.quantity == 0 or item.unitsPerCarton == 0) { return #err("Quantity and units per carton must be positive") };
    if (not (item.costPrice >= 0.0 and item.costPrice < 1e15)) { return #err("Enter a valid cost price") };
    // Track highest ever quantity
    let highestEver = if (item.quantity > item.highestEverQuantity) { item.quantity } else { item.highestEverQuantity };
    let finalItem : InventoryItem = { item with approved = isAdmin; highestEverQuantity = highestEver };
    inventory.add(item.id, finalItem);

    logAudit(item.bookId, "CREATE", "inventory", item.id, caller, getActorName(caller),
      "Added inventory item: " # item.name # " qty: " # item.quantity.toText());

    if (isAdmin) {
      // Auto-record as a purchase transaction
      let purchaseTxId = item.bookId # "-invpurchase-" # item.id # "-" # Time.now().toText();
      let totalCost = item.costPrice * item.quantity.toFloat();
      let purchaseTx : Transaction = {
        id = purchaseTxId;
        date = Time.now();
        customerName = item.supplier;
        phone = "";
        email = "";
        brand = item.brand;
        productType = item.productType;
        typeSubtype = "Purchases";
        itemName = item.name;
        cartons = item.quantity / (if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 });
        unitsPerCarton = if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 };
        pricePerCarton = item.costPrice * (if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 }).toFloat();
        amount = totalCost;
        sellingPriceAtSale = 0.0;
        costPriceAtSale = item.costPrice;
        currency = "NGN";
        paymentMethod = "cash";
        notes = "Auto-recorded from inventory addition";
        bookId = item.bookId;
        createdBy = caller;
        approved = true;
        approvalProcessed = true;
      };
      transactions.add(purchaseTxId, purchaseTx);
      Debug.print("Inventory item added and purchase auto-recorded: " # item.id);
      #ok("Inventory item added successfully");
    } else {
      Debug.print("Inventory item pending approval: " # item.id);
      #ok("Inventory item submitted for approval");
    };
  };

  public shared ({ caller }) func updateInventoryItem(item : InventoryItem) : async MutResult {
    Debug.print("updateInventoryItem - caller: " # caller.toText() # ", id: " # item.id);

    if (not isBookMember(caller, item.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    if (not isBookAdminMember(caller, item.bookId)) {
      return #err("Unauthorized: Only book admins can update inventory");
    };

    // Preserve highestEverQuantity across updates
    let existingHigh = switch (inventory.get(item.id)) {
      case null { return #err("Inventory item not found") };
      case (?existing) {
        if (existing.bookId != item.bookId) { return #err("Item does not belong to this book") };
        if (existing.quantity != item.quantity or existing.approved != item.approved) { return #err("Record a purchase or sale to change stock; use the approval workflow to change status") };
        if (item.quantity > existing.highestEverQuantity) { item.quantity } else { existing.highestEverQuantity }
      };
    };
    inventory.add(item.id, { item with highestEverQuantity = existingHigh });
    Debug.print("Inventory item updated: " # item.id);
    #ok("Inventory item updated successfully");
  };

  public shared ({ caller }) func approveInventoryItem(itemId : Text) : async MutResult {
    Debug.print("approveInventoryItem - caller: " # caller.toText() # ", id: " # itemId);

    switch (inventory.get(itemId)) {
      case null { return #err("Inventory item not found") };
      case (?item) {
        if (not isBookAdminMember(caller, item.bookId)) {
          return #err("Unauthorized: Only book admins can approve inventory items");
        };
        if (item.approved) { return #err("Inventory item already approved") };
        let highestEver = if (item.quantity > item.highestEverQuantity) { item.quantity } else { item.highestEverQuantity };
        let approvedItem = { item with approved = true; highestEverQuantity = highestEver };
        inventory.add(itemId, approvedItem);

        // Auto-record purchase transaction on approval
        let purchaseTxId = item.bookId # "-invpurchase-" # itemId # "-" # Time.now().toText();
        let totalCost = item.costPrice * item.quantity.toFloat();
        let purchaseTx : Transaction = {
          id = purchaseTxId;
          date = Time.now();
          customerName = item.supplier;
          phone = "";
          email = "";
          brand = item.brand;
          productType = item.productType;
          typeSubtype = "Purchases";
          itemName = item.name;
          cartons = item.quantity / (if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 });
          unitsPerCarton = if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 };
          pricePerCarton = item.costPrice * (if (item.unitsPerCarton > 0) { item.unitsPerCarton } else { 1 }).toFloat();
          amount = totalCost;
          sellingPriceAtSale = 0.0;
          costPriceAtSale = item.costPrice;
          currency = "NGN";
          paymentMethod = "cash";
          notes = "Auto-recorded from inventory approval";
          bookId = item.bookId;
          createdBy = caller;
          approved = true;
          approvalProcessed = true;
        };
        transactions.add(purchaseTxId, purchaseTx);

        checkAndCreateDraftPurchaseOrder(approvedItem);

        logAudit(item.bookId, "APPROVE", "inventory", itemId, caller, getActorName(caller),
          "Approved inventory item: " # item.name);
        Debug.print("Inventory item approved: " # itemId);
        #ok("Inventory item approved successfully");
      };
    };
  };

  public shared ({ caller }) func rejectInventoryItem(itemId : Text) : async MutResult {
    Debug.print("rejectInventoryItem - caller: " # caller.toText() # ", id: " # itemId);

    switch (inventory.get(itemId)) {
      case null { return #err("Inventory item not found") };
      case (?item) {
        if (not isBookAdminMember(caller, item.bookId)) {
          return #err("Unauthorized: Only book admins can reject inventory items");
        };
        if (item.approved) { return #err("Posted inventory cannot be rejected") };
        inventory.remove(itemId);
        logAudit(item.bookId, "REJECT", "inventory", itemId, caller, getActorName(caller),
          "Rejected inventory item: " # item.name);
        Debug.print("Inventory item rejected: " # itemId);
        #ok("Inventory item rejected successfully");
      };
    };
  };

  public query ({ caller }) func getInventory(bookId : Text) : async [InventoryItem] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and (isAdmin or item.approved)
      })
      .toArray();
  };

  public query ({ caller }) func getPendingInventory(bookId : Text) : async [InventoryItem] {
    if (not isBookAdminMember(caller, bookId)) {
      Runtime.trap("Unauthorized: Only book admins can view pending inventory");
    };

    inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and not item.approved
      })
      .toArray();
  };

  // Case-insensitive search on inventory name, brand, productType, supplier
  public query ({ caller }) func searchInventory(bookId : Text, searchTerm : Text) : async [InventoryItem] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);

    if (searchTerm == "") {
      return inventory.values()
        .filter(func(item : InventoryItem) : Bool {
          item.bookId == bookId and (isAdmin or item.approved)
        })
        .toArray();
    };

    inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and (isAdmin or item.approved) and (
          textContainsIgnoreCase(item.name, searchTerm) or
          textContainsIgnoreCase(item.brand, searchTerm) or
          textContainsIgnoreCase(item.productType, searchTerm) or
          textContainsIgnoreCase(item.supplier, searchTerm)
        )
      })
      .toArray();
  };

  // Returns items where currentQty <= 30% of historicalMax (70% sold = low stock)
  public query ({ caller }) func getLowStockAlerts(bookId : Text) : async [InventoryItem] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        if (not (item.bookId == bookId and (isAdmin or item.approved))) { return false };
        if (item.highestEverQuantity == 0) { return false };
        let threshold = item.highestEverQuantity * 30 / 100;
        item.quantity <= threshold
      })
      .toArray();
  };

  // Multi-location inventory API

  public shared ({ caller }) func createLocation(bookId : Text, name : Text) : async MutResult {
    Debug.print("createLocation - caller: " # caller.toText() # ", bookId: " # bookId);

    if (not isBookAdminMember(caller, bookId)) {
      return #err("Unauthorized: Only book admins can create locations");
    };

    let locationId = bookId # "-loc-" # name # "-" # Time.now().toText();
    let location : Location = {
      id = locationId;
      name;
      bookId;
      createdBy = caller;
      createdAt = Time.now();
    };
    locations.add(locationId, location);

    logAudit(bookId, "CREATE", "location", locationId, caller, getActorName(caller),
      "Created location: " # name);
    Debug.print("Location created: " # locationId);
    #ok(locationId);
  };

  public query ({ caller }) func getLocations(bookId : Text) : async [Location] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    locations.values()
      .filter(func(loc : Location) : Bool { loc.bookId == bookId })
      .toArray();
  };

  public shared ({ caller }) func deleteLocation(bookId : Text, locationId : Text) : async MutResult {
    Debug.print("deleteLocation - caller: " # caller.toText() # ", locationId: " # locationId);

    if (not isBookAdminMember(caller, bookId)) {
      return #err("Unauthorized: Only book admins can delete locations");
    };

    switch (locations.get(locationId)) {
      case null { return #err("Location not found") };
      case (?loc) {
        if (loc.bookId != bookId) { return #err("Location does not belong to this book") };
        if (inventory.values().find(func(item : InventoryItem) : Bool { item.bookId == bookId and item.locationId == locationId }) != null) { return #err("Move inventory before deleting this location") };
        locations.remove(locationId);
        Debug.print("Location deleted: " # locationId);
        #ok("Location deleted successfully");
      };
    };
  };

  public query ({ caller }) func getInventoryByLocation(bookId : Text, locationId : Text) : async [InventoryItem] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and item.locationId == locationId and (isAdmin or item.approved)
      })
      .toArray();
  };

  public shared ({ caller }) func transferInventory(
    bookId : Text,
    itemId : Text,
    fromLocationId : Text,
    toLocationId : Text,
    quantity : Nat,
    unit : Text
  ) : async MutResult {
    Debug.print("transferInventory - caller: " # caller.toText() # ", itemId: " # itemId);

    if (not isBookAdminMember(caller, bookId)) {
      return #err("Unauthorized: Only book admins can transfer inventory");
    };
    if (quantity == 0 or fromLocationId == toLocationId) { return #err("Choose a different destination and a positive quantity") };
    if (unit != "cartons" and unit != "units") { return #err("Invalid quantity unit") };
    switch (locations.get(toLocationId)) {
      case (?location) { if (location.bookId != bookId) { return #err("Destination belongs to another book") } };
      case null { return #err("Destination location not found") };
    };

    switch (inventory.get(itemId)) {
      case null { return #err("Inventory item not found") };
      case (?item) {
        if (item.bookId != bookId) { return #err("Item does not belong to this book") };
        if (not item.approved) { return #err("Approve inventory before transferring it") };
        if (item.locationId != fromLocationId) { return #err("Item is not at the specified source location") };

        let unitsToTransfer = if (unit == "cartons" and item.unitsPerCarton > 0) {
          quantity * item.unitsPerCarton
        } else { quantity };

        if (item.quantity < unitsToTransfer) {
          return #err("Insufficient quantity at source location");
        };

        // Decrement source item
        let updatedSrc = { item with quantity = item.quantity - unitsToTransfer };
        inventory.add(itemId, updatedSrc);
        checkAndCreateDraftPurchaseOrder(updatedSrc);

        // Find or create item at destination
        let destEntry = inventory.entries().find(func((_, inv) : (Text, InventoryItem)) : Bool {
          inv.bookId == bookId and inv.locationId == toLocationId and
          inv.name.toLower() == item.name.toLower()
        });

        switch (destEntry) {
          case null {
            let newItemId = bookId # "-" # toLocationId # "-" # item.name # "-" # Time.now().toText();
            let newItem : InventoryItem = {
              item with
              id = newItemId;
              quantity = unitsToTransfer;
              locationId = toLocationId;
              highestEverQuantity = unitsToTransfer;
            };
            inventory.add(newItemId, newItem);
          };
          case (?(destId, destItem)) {
            let newQty = destItem.quantity + unitsToTransfer;
            let newHigh = if (newQty > destItem.highestEverQuantity) { newQty } else { destItem.highestEverQuantity };
            inventory.add(destId, { destItem with quantity = newQty; highestEverQuantity = newHigh });
          };
        };

        // Log the transfer
        let transferId = bookId # "-transfer-" # Time.now().toText();
        let transfer : InventoryTransfer = {
          id = transferId;
          itemId;
          itemName = item.name;
          fromLocationId;
          toLocationId;
          quantity;
          unit;
          transferredBy = caller;
          bookId;
          transferredAt = Time.now();
        };
        inventoryTransfers.add(transferId, transfer);

        logAudit(bookId, "UPDATE", "inventory", itemId, caller, getActorName(caller),
          "Transferred " # quantity.toText() # " " # unit # " of " # item.name # " to location " # toLocationId);
        Debug.print("Inventory transferred: " # transferId);
        #ok("Inventory transferred successfully");
      };
    };
  };

  public query ({ caller }) func getInventoryTransfers(bookId : Text) : async [InventoryTransfer] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    inventoryTransfers.values()
      .filter(func(t : InventoryTransfer) : Bool { t.bookId == bookId })
      .toArray();
  };

  // Gross margin by period: (sellingPriceAtSale - costPriceAtSale) * quantity for sales in range
  public query ({ caller }) func getGrossMarginByPeriod(bookId : Text, startTime : Int, endTime : Int) : async Float {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    var grossMargin = 0.0;

    for ((_, tx) in transactions.entries()) {
      if (
        tx.bookId == bookId and
        tx.approved and
        tx.date >= startTime and
        tx.date <= endTime and
        (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales")
      ) {
        grossMargin += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
      };
    };

    grossMargin;
  };

  // ─── Expense public API ───────────────────────────────────────────────────

  public shared ({ caller }) func addExpense(expense : Expense) : async MutResult {
    Debug.print("addExpense - caller: " # caller.toText() # ", bookId: " # expense.bookId);

    if (not isBookMember(caller, expense.bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, expense.bookId);
    expenses.add(expense.id, { expense with approved = isAdmin; createdBy = caller });

    logAudit(expense.bookId, "CREATE", "expense", expense.id, caller, getActorName(caller),
      "Added expense: " # expense.description # " amount: " # expense.amount.toText());

    if (isAdmin) {
      Debug.print("Expense added and approved: " # expense.id);
      #ok("Expense added successfully");
    } else {
      Debug.print("Expense pending approval: " # expense.id);
      #ok("Expense submitted for approval");
    };
  };

  public shared ({ caller }) func approveExpense(expenseId : Text) : async MutResult {
    Debug.print("approveExpense - caller: " # caller.toText() # ", id: " # expenseId);

    switch (expenses.get(expenseId)) {
      case null { return #err("Expense not found") };
      case (?exp) {
        if (not isBookAdminMember(caller, exp.bookId)) {
          return #err("Unauthorized: Only book admins can approve expenses");
        };
        expenses.add(expenseId, { exp with approved = true });
        logAudit(exp.bookId, "APPROVE", "expense", expenseId, caller, getActorName(caller),
          "Approved expense: " # exp.description);
        Debug.print("Expense approved: " # expenseId);
        #ok("Expense approved successfully");
      };
    };
  };

  public shared ({ caller }) func rejectExpense(expenseId : Text) : async MutResult {
    Debug.print("rejectExpense - caller: " # caller.toText() # ", id: " # expenseId);

    switch (expenses.get(expenseId)) {
      case null { return #err("Expense not found") };
      case (?exp) {
        if (not isBookAdminMember(caller, exp.bookId)) {
          return #err("Unauthorized: Only book admins can reject expenses");
        };
        expenses.remove(expenseId);
        logAudit(exp.bookId, "REJECT", "expense", expenseId, caller, getActorName(caller),
          "Rejected expense: " # exp.description);
        Debug.print("Expense rejected: " # expenseId);
        #ok("Expense rejected successfully");
      };
    };
  };

  public query ({ caller }) func getExpenses(bookId : Text) : async [Expense] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    expenses.values()
      .filter(func(exp : Expense) : Bool {
        exp.bookId == bookId and exp.approved
      })
      .toArray();
  };

  public query ({ caller }) func getPendingExpenses(bookId : Text) : async [Expense] {
    if (not isBookAdminMember(caller, bookId)) {
      Runtime.trap("Unauthorized: Only book admins can view pending expenses");
    };

    expenses.values()
      .filter(func(exp : Expense) : Bool {
        exp.bookId == bookId and not exp.approved
      })
      .toArray();
  };

  // ─── System settings public API ───────────────────────────────────────────

  public shared ({ caller }) func updateSystemSettings(settings : SystemSettings) : async () {
    Debug.print("updateSystemSettings - caller: " # caller.toText());
    if (not acIsAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can update system settings");
    };
    systemSettings.add("default", settings);
    Debug.print("System settings updated");
  };

  public query func getSystemSettings() : async ?SystemSettings {
    systemSettings.get("default");
  };

  // ─── User management public API ───────────────────────────────────────────

  public query func getUserDisplayName(user : Principal) : async Text {
    switch (userProfiles.get(user)) {
      case null { "Unknown User" };
      case (?p) { p.name };
    };
  };

  public query ({ caller }) func getBookMembersWithNames(bookId : Text) : async [(Principal, Text, Bool)] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    switch (accountingBooks.get(bookId)) {
      case null { [] };
      case (?book) {
        book.members.map<Principal, (Principal, Text, Bool)>(func(member) {
          let name = switch (userProfiles.get(member)) {
            case null { "Unknown User" };
            case (?p) { p.name };
          };
          let isAdminMember = book.adminMembers.find<Principal>(
            func(a) { Principal.equal(a, member) }
          ) != null;
          (member, name, isAdminMember);
        });
      };
    };
  };

  public query ({ caller }) func getBookMembers(bookId : Text) : async [Principal] {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    switch (accountingBooks.get(bookId)) {
      case null { [] };
      case (?book) { book.members };
    };
  };

  // Accept principalText as Text to avoid frontend Principal-wrapping serialization issues
  public shared ({ caller }) func removeUserFromBook(bookId : Text, principalText : Text) : async JoinRequestResult {
    Debug.print("=== removeUserFromBook START ===");
    Debug.print("Caller: " # caller.toText());
    Debug.print("User to remove (text): " # principalText);
    Debug.print("Book ID: " # bookId);

    // Convert text to Principal — guards against wrapped {__kind__: Principal} objects
    let userPrincipal : Principal = Principal.fromText(principalText);
    Debug.print("User to remove (principal): " # userPrincipal.toText());

    // Only book admin members (admins) can remove other users
    if (not isBookAdminMember(caller, bookId)) {
      Debug.print("FAILED: Caller is not a book admin member");
      return #err("Unauthorized: Only book admins can remove users");
    };

    switch (accountingBooks.get(bookId)) {
      case null {
        Debug.print("FAILED: Book not found");
        return #err("Book not found");
      };
      case (?book) {
        // Permanent admin (creator) is non-removable
        if (Principal.equal(userPrincipal, book.admin)) {
          Debug.print("FAILED: Cannot remove permanent admin");
          return #err("Cannot remove the permanent admin of the book");
        };

        if (book.members.find<Principal>(func(m) { Principal.equal(m, userPrincipal) }) == null) {
          Debug.print("FAILED: User is not a member");
          return #err("User is not a member of this book");
        };

        let updatedMembers = book.members.filter(
          func(m) { not Principal.equal(m, userPrincipal) }
        );
        let updatedAdminMembers = book.adminMembers.filter(
          func(a) { not Principal.equal(a, userPrincipal) }
        );

        accountingBooks.add(bookId, {
          book with
          members = updatedMembers;
          adminMembers = updatedAdminMembers;
        });

        let currentBooks = switch (userBooks.get(userPrincipal)) {
          case null { [] };
          case (?books) { books.filter(func(id) { id != bookId }) };
        };
        userBooks.add(userPrincipal, currentBooks);

        // Also remove all pending join requests for this user in this book
        let reqId = userPrincipal.toText() # "-" # bookId;
        joinRequests.remove(reqId);

        logAudit(bookId, "DELETE", "user", userPrincipal.toText(), caller, getActorName(caller),
          "Removed user " # userPrincipal.toText() # " from book");
        Debug.print("User removed successfully: " # userPrincipal.toText());
        Debug.print("=== removeUserFromBook END (SUCCESS) ===");
        #ok("User removed successfully from book");
      };
    };
  };

  // Accept principalText as Text to avoid frontend Principal-wrapping serialization issues
  public shared ({ caller }) func changeUserRole(bookId : Text, principalText : Text, makeAdmin : Bool) : async JoinRequestResult {
    Debug.print("=== changeUserRole START ===");
    Debug.print("Caller: " # caller.toText());
    Debug.print("User (text): " # principalText);
    Debug.print("makeAdmin: " # debug_show(makeAdmin));

    // Convert text to Principal
    let userPrincipal : Principal = Principal.fromText(principalText);
    Debug.print("User (principal): " # userPrincipal.toText());

    // Only permanent admin (book creator) can change roles
    if (not isBookAdmin(caller, bookId)) {
      Debug.print("FAILED: Caller is not permanent admin");
      return #err("Unauthorized: Only the permanent admin (book creator) can change user roles");
    };

    switch (accountingBooks.get(bookId)) {
      case null {
        Debug.print("FAILED: Book not found");
        return #err("Book not found");
      };
      case (?book) {
        if (Principal.equal(userPrincipal, book.admin)) {
          Debug.print("FAILED: Cannot change permanent admin's role");
          return #err("Cannot change the permanent admin's role");
        };

        if (book.members.find<Principal>(func(m) { Principal.equal(m, userPrincipal) }) == null) {
          Debug.print("FAILED: User is not a member");
          return #err("User is not a member of this book");
        };

        let isCurrentlyAdmin = book.adminMembers.find<Principal>(
          func(a) { Principal.equal(a, userPrincipal) }
        ) != null;

        Debug.print("isCurrentlyAdmin: " # debug_show(isCurrentlyAdmin) # ", makeAdmin: " # debug_show(makeAdmin));

        let updatedAdminMembers = if (makeAdmin) {
          if (isCurrentlyAdmin) {
            Debug.print("User is already an admin, no change needed");
            book.adminMembers;
          } else {
            Debug.print("Promoting user to admin: " # userPrincipal.toText());
            book.adminMembers.concat([userPrincipal]);
          };
        } else {
          if (not isCurrentlyAdmin) {
            Debug.print("User is already not an admin, no change needed");
            book.adminMembers;
          } else {
            Debug.print("Demoting user from admin: " # userPrincipal.toText());
            book.adminMembers.filter(
              func(a) { not Principal.equal(a, userPrincipal) }
            );
          };
        };

        accountingBooks.add(bookId, { book with adminMembers = updatedAdminMembers });

        logAudit(bookId, "UPDATE", "user", userPrincipal.toText(), caller, getActorName(caller),
          "Changed user " # userPrincipal.toText() # " admin status to: " # debug_show(makeAdmin));
        Debug.print("User role changed successfully for: " # userPrincipal.toText());
        Debug.print("=== changeUserRole END (SUCCESS) ===");
        #ok("User role changed successfully in book");
      };
    };
  };

  public shared ({ caller }) func removeSelfFromBook(bookId : Text) : async JoinRequestResult {
    Debug.print("=== removeSelfFromBook START ===");
    Debug.print("Caller: " # caller.toText());

    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous users cannot remove themselves from books");
    };

    switch (accountingBooks.get(bookId)) {
      case null {
        return #err("Book not found");
      };
      case (?book) {
        if (Principal.equal(caller, book.admin)) {
          return #err("Permanent admin cannot remove themselves from the book");
        };

        if (book.members.find<Principal>(func(m) { Principal.equal(m, caller) }) == null) {
          return #err("You are not a member of this book");
        };

        let updatedMembers = book.members.filter(
          func(m) { not Principal.equal(m, caller) }
        );
        let updatedAdminMembers = book.adminMembers.filter(
          func(a) { not Principal.equal(a, caller) }
        );

        accountingBooks.add(bookId, {
          book with
          members = updatedMembers;
          adminMembers = updatedAdminMembers;
        });

        let currentBooks = switch (userBooks.get(caller)) {
          case null { [] };
          case (?books) { books.filter(func(id) { id != bookId }) };
        };
        userBooks.add(caller, currentBooks);

        Debug.print("=== removeSelfFromBook END (SUCCESS) ===");
        #ok("You have been removed from the book successfully");
      };
    };
  };

  public shared ({ caller }) func deleteBook(bookId : Text) : async JoinRequestResult {
    Debug.print("=== deleteBook START ===");
    Debug.print("Caller: " # caller.toText());

    if (caller.isAnonymous()) {
      return #err("Unauthorized: Anonymous users cannot delete books");
    };

    switch (accountingBooks.get(bookId)) {
      case null {
        return #err("Book not found");
      };
      case (?book) {
        if (Principal.equal(caller, book.admin)) {
          // Permanent admin: delete the entire book and remove all members
          for (member in book.members.values()) {
            let currentBooks = switch (userBooks.get(member)) {
              case null { [] };
              case (?books) { books.filter(func(id) { id != bookId }) };
            };
            userBooks.add(member, currentBooks);
          };

          // Remove all join requests for this book
          let reqsToRemove = joinRequests.entries()
            .filter(func((_, req) : (Text, JoinRequest)) : Bool { req.bookId == bookId })
            .map(func((k, _)) { k })
            .toArray();
          for (reqId in reqsToRemove.values()) {
            joinRequests.remove(reqId);
          };

          accountingBooks.remove(bookId);
          Debug.print("Book permanently deleted by permanent admin: " # bookId);
          Debug.print("=== deleteBook END (SUCCESS - permanent delete) ===");
          #ok("Book deleted successfully");
        } else if (isBookMember(caller, bookId)) {
          // Non-permanent-admin: just remove self from the book
          let updatedMembers = book.members.filter(
            func(m) { not Principal.equal(m, caller) }
          );
          let updatedAdminMembers = book.adminMembers.filter(
            func(a) { not Principal.equal(a, caller) }
          );
          accountingBooks.add(bookId, {
            book with
            members = updatedMembers;
            adminMembers = updatedAdminMembers;
          });

          let currentBooks = switch (userBooks.get(caller)) {
            case null { [] };
            case (?books) { books.filter(func(id) { id != bookId }) };
          };
          userBooks.add(caller, currentBooks);

          Debug.print("Non-admin removed self from book: " # bookId);
          Debug.print("=== deleteBook END (SUCCESS - self-remove) ===");
          #ok("You have been removed from the book successfully");
        } else {
          #err("Unauthorized: You must be a member or the permanent admin of this book");
        };
      };
    };
  };

  // ─── Dashboard & analytics public API ────────────────────────────────────

  public query ({ caller }) func getDashboardMetrics(bookId : Text) : async {
    totalInflows : Int;
    grossMargin : Int;
    totalCustomers : Nat;
    customersWithDebt : Nat;
    totalOutstandingDebt : Int;
    inventoryItems : Nat;
    lowStockCount : Nat;
    lowStockItems : [(Text, Nat, Nat)];
    recentTransactions : [Transaction];
    pendingCount : Nat;
  } {
    // Book membership is sufficient — global AC role is not required for book-scoped data
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);

    // totalInflows = sales + credit sales amounts
    // grossMargin = sum of (sellingPriceAtSale - costPriceAtSale) * quantity for approved sales/credit-sales
    var totalInflows = 0.0;
    var grossMargin = 0.0;

    for ((_, tx) in transactions.entries()) {
      if (tx.bookId == bookId and tx.approved) {
        switch (tx.typeSubtype) {
          case "Sales" {
            totalInflows += tx.amount;
            grossMargin += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
          };
          case "Credit Sales" {
            totalInflows += tx.amount;
            grossMargin += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
          };
          case _ {};
        };
      };
    };

    // Customer stats from auto-tracked profiles
    let bookCustomers = customerLedger(bookId);

    var customersWithDebt = 0;
    var totalOutstandingDebt = 0.0;
    for (c in bookCustomers.values()) {
      if (c.outstandingDebt > 0.0) {
        customersWithDebt += 1;
        totalOutstandingDebt += c.outstandingDebt;
      };
    };

    // Inventory stats with 70% sold low-stock threshold
    let bookInventory = inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and (isAdmin or item.approved)
      })
      .toArray();

    var lowStockCount = 0;
    var lowStockItems : [(Text, Nat, Nat)] = [];

    for (item in bookInventory.values()) {
      if (item.highestEverQuantity > 0) {
        let threshold = item.highestEverQuantity * 30 / 100;
        if (item.quantity <= threshold) {
          lowStockCount += 1;
          let cartons = if (item.unitsPerCarton > 0) { item.quantity / item.unitsPerCarton } else { 0 };
          lowStockItems := lowStockItems.concat<(Text, Nat, Nat)>(
            [(item.name, cartons, item.quantity)]
          );
        };
      };
    };

    // Recent transactions (top 20 sorted by date desc)
    let bookTxs = transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and tx.approved
      })
      .toArray();

    let sortedTxs = bookTxs.sort(func(a : Transaction, b : Transaction) : { #less; #equal; #greater } {
      if (a.date > b.date) { #less } else if (a.date < b.date) { #greater } else { #equal }
    });
    let recentCount = if (sortedTxs.size() > 20) { 20 } else { sortedTxs.size() };
    let recentTransactions = Array.tabulate(recentCount, func(i) { sortedTxs[i] });

    // Pending count (admin only)
    var pendingTxCount = 0;
    var pendingInvCount = 0;
    var pendingExpCount = 0;
    if (isAdmin) {
      for ((_, tx) in transactions.entries()) {
        if (tx.bookId == bookId and not tx.approved) { pendingTxCount += 1 };
      };
      for ((_, item) in inventory.entries()) {
        if (item.bookId == bookId and not item.approved) { pendingInvCount += 1 };
      };
      for ((_, exp) in expenses.entries()) {
        if (exp.bookId == bookId and not exp.approved) { pendingExpCount += 1 };
      };
    };
    let pendingCount = pendingTxCount + pendingInvCount + pendingExpCount;

    {
      totalInflows = totalInflows.toInt();
      grossMargin = grossMargin.toInt();
      totalCustomers = bookCustomers.size();
      customersWithDebt;
      totalOutstandingDebt = totalOutstandingDebt.toInt();
      inventoryItems = bookInventory.size();
      lowStockCount;
      lowStockItems;
      recentTransactions;
      pendingCount;
    };
  };

  public query ({ caller }) func getOutstandingCredits(bookId : Text) : async {
    totalOutstanding : Float;
    customersWithDebt : Nat;
    outstandingCredits : [{
      debtor : Text;
      totalOwed : Float;
      amountPaid : Float;
      balance : Float;
      paybackDate : Time.Time;
    }];
  } {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);
    var totalOutstanding = 0.0;
    var customersWithDebt = 0;
    var outstandingCredits : [{
      debtor : Text;
      totalOwed : Float;
      amountPaid : Float;
      balance : Float;
      paybackDate : Time.Time;
    }] = [];

    for (customer in customerLedger(bookId).values()) {
      if (customer.outstandingDebt > 0.0) {
        totalOutstanding += customer.outstandingDebt;
        customersWithDebt += 1;
        outstandingCredits := outstandingCredits.concat([{
          debtor = customer.name;
          totalOwed = customer.outstandingDebt;
          amountPaid = 0.0;
          balance = customer.outstandingDebt;
          paybackDate = customer.lastTransactionDate + 30 * 24 * 60 * 60 * 1_000_000_000;
        }]);
      };
    };

    { totalOutstanding; customersWithDebt; outstandingCredits };
  };

  public query ({ caller }) func getTopItemsAndCustomers(bookId : Text) : async {
    topItems : [{
      sku : Text;
      brand : Text;
      totalUnitsSold : Nat;
      grossProfit : Float;
    }];
    topCustomers : [{
      name : Text;
      totalSpent : Float;
      lastSaleDate : Time.Time;
    }];
  } {
    if (not isBookMember(caller, bookId)) {
      Runtime.trap("Unauthorized: You must be a member of this book");
    };

    let isAdmin = isBookAdminMember(caller, bookId);

    let bookInventory = inventory.values()
      .filter(func(item : InventoryItem) : Bool {
        item.bookId == bookId and (isAdmin or item.approved)
      })
      .toArray();

    var itemSales : [(Text, Text, Nat, Float)] = [];

    for (item in bookInventory.values()) {
      var totalUnitsSold = 0;
      var grossProfit = 0.0;

      for ((_, tx) in transactions.entries()) {
        if (tx.bookId == bookId and
            tx.itemName.toLower() == item.name.toLower() and
            (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
            tx.approved) {
          totalUnitsSold += tx.cartons * tx.unitsPerCarton;
          // Use stored price-at-sale for accurate gross profit
          grossProfit += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
        };
      };

      itemSales := itemSales.concat<(Text, Text, Nat, Float)>(
        [(item.id, item.name, totalUnitsSold, grossProfit)]
      );
    };

    // Use auto-tracked customer profiles for top customers
    var customerSales : [(Text, Float, Time.Time)] = [];

    for ((_, cust) in customers.entries()) {
      if (cust.bookId == bookId) {
        customerSales := customerSales.concat<(Text, Float, Time.Time)>(
          [(cust.name, cust.totalSpent, cust.lastTransactionDate)]
        );
      };
    };

    let sortedItems = itemSales.sort(func(a, b) {
      if (a.2 > b.2) { #less } else if (a.2 < b.2) { #greater } else { #equal }
    });

    let sortedCustomers = customerSales.sort(func(a, b) {
      if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
    });

    let topCount = if (sortedItems.size() > 20) { 20 } else { sortedItems.size() };
    let custCount = if (sortedCustomers.size() > 20) { 20 } else { sortedCustomers.size() };

    let topItems = Array.tabulate(topCount, func(i) {
      { sku = sortedItems[i].0; brand = sortedItems[i].1; totalUnitsSold = sortedItems[i].2; grossProfit = sortedItems[i].3 };
    });

    let topCustomers = Array.tabulate(custCount, func(i) {
      { name = sortedCustomers[i].0; totalSpent = sortedCustomers[i].1; lastSaleDate = sortedCustomers[i].2 };
    });

    { topItems; topCustomers };
  };

  // ─── NEW: Audit log API ───────────────────────────────────────────────────

  public shared query({ caller }) func getAuditLog(bookId : Text) : async { #ok : [AuditLogEntry]; #err : Text } {
    if (not isBookAdmin(caller, bookId)) {
      return #err("Unauthorized: Only the permanent admin can view the audit log");
    };
    let entries = auditLog.get(bookId).get([]);
    // Return sorted by timestamp descending
    let sorted = entries.sort(func(a : AuditLogEntry, b : AuditLogEntry) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) { #greater } else { #equal }
    });
    #ok(sorted);
  };

  // ─── NEW: Book settings API ───────────────────────────────────────────────

  public shared({ caller }) func updateBookSettings(bookId : Text, settings : BookSettings) : async { #ok : (); #err : Text } {
    if (not isBookAdminMember(caller, bookId)) {
      return #err("Unauthorized: Only book admins can update settings");
    };
    bookSettings.add(bookId, settings);
    Debug.print("BookSettings updated for book: " # bookId);
    #ok(());
  };

  public shared query({ caller }) func getBookSettings(bookId : Text) : async { #ok : BookSettings; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    let settings = switch (bookSettings.get(bookId)) {
      case (?s) { s };
      case null {
        {
          bookId;
          baseCurrency = "NGN";
          exchangeRate = 1600.0;
          hideCostPricesFromNonAdmins = false;
          scheduledSummaryFrequency = "weekly";
          lastSummaryDate = 0;
        };
      };
    };
    #ok(settings);
  };

  // ─── NEW: Draft purchase orders API ──────────────────────────────────────

  public shared query({ caller }) func getDraftPurchaseOrders(bookId : Text) : async { #ok : [DraftPurchaseOrder]; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    let orders = draftPurchaseOrders.get(bookId).get([]);
    let drafts = orders.filter(func(o : DraftPurchaseOrder) : Bool { o.status == "draft" });
    #ok(drafts);
  };

  public shared({ caller }) func dismissDraftPurchaseOrder(bookId : Text, orderId : Text) : async { #ok : (); #err : Text } {
    if (not isBookAdminMember(caller, bookId)) {
      return #err("Unauthorized: Only book admins can dismiss draft purchase orders");
    };
    let orders = draftPurchaseOrders.get(bookId).get([]);
    let updated = orders.map(func(o) {
      if (o.id == orderId) { { o with status = "dismissed" } } else { o }
    });
    draftPurchaseOrders.add(bookId, updated);
    Debug.print("DraftPurchaseOrder dismissed: " # orderId);
    #ok(());
  };

  // ─── NEW: Customer statement API ──────────────────────────────────────────

  public shared query({ caller }) func getCustomerStatement(bookId : Text, customerName : Text) : async { #ok : CustomerStatement; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    let isAdmin = isBookAdminMember(caller, bookId);
    let lowerName = customerName.toLower();

    let customerTxs = transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and
        tx.approved and
        tx.customerName.toLower() == lowerName
      })
      .toArray();

    var totalPurchases = 0.0;
    var totalPayments = 0.0;

    for (tx in customerTxs.values()) {
      if (tx.typeSubtype == "Sales") {
        totalPurchases += tx.amount;
        totalPayments += tx.amount;  // cash sales = immediate payment
      } else if (tx.typeSubtype == "Credit Sales") {
        totalPurchases += tx.amount;
        // credit sales = no payment yet (tracked separately)
      };
    };

    let currentBalance = totalPurchases - totalPayments;

    #ok({
      customerName;
      totalPurchases;
      totalPayments;
      currentBalance;
      transactions = customerTxs;
    });
  };

  // ─── NEW: Aging report API ────────────────────────────────────────────────

  public shared query({ caller }) func getAgingReport(bookId : Text) : async { #ok : [AgingBucket]; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    let isAdmin = isBookAdminMember(caller, bookId);
    let nowNs = Time.now();
    let dayNs : Int = 24 * 60 * 60 * 1_000_000_000;

    var b0_30 : [Transaction] = [];
    var b31_60 : [Transaction] = [];
    var b61_90 : [Transaction] = [];
    var b90plus : [Transaction] = [];

    for ((_, tx) in transactions.entries()) {
      if (tx.bookId == bookId and tx.approved and tx.typeSubtype == "Credit Sales") {
        let dueDate = tx.date + 30 * dayNs;
        if (dueDate >= nowNs) {
          // not yet overdue
        } else {
          let overdueDays = (nowNs - dueDate) / dayNs;
          if (overdueDays <= 30) {
            b0_30 := b0_30.concat([tx]);
          } else if (overdueDays <= 60) {
            b31_60 := b31_60.concat([tx]);
          } else if (overdueDays <= 90) {
            b61_90 := b61_90.concat([tx]);
          } else {
            b90plus := b90plus.concat([tx]);
          };
        };
      };
    };

    func sumTxs(txs : [Transaction]) : Float {
      txs.foldLeft(0.0, func(acc, tx : Transaction) { acc + tx.amount });
    };

    #ok([
      { bucketLabel = "0-30 days"; totalAmount = sumTxs(b0_30); count = b0_30.size(); transactions = b0_30 },
      { bucketLabel = "31-60 days"; totalAmount = sumTxs(b31_60); count = b31_60.size(); transactions = b31_60 },
      { bucketLabel = "61-90 days"; totalAmount = sumTxs(b61_90); count = b61_90.size(); transactions = b61_90 },
      { bucketLabel = "90+ days"; totalAmount = sumTxs(b90plus); count = b90plus.size(); transactions = b90plus },
    ]);
  };

  // ─── NEW: Scheduled summary API ───────────────────────────────────────────

  public shared({ caller }) func getOrGenerateScheduledSummary(bookId : Text) : async { #ok : ScheduledSummary; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      return #err("Unauthorized: You must be a member of this book");
    };
    let isAdmin = isBookAdminMember(caller, bookId);

    let settings = switch (bookSettings.get(bookId)) {
      case (?s) { s };
      case null {
        {
          bookId;
          baseCurrency = "NGN";
          exchangeRate = 1600.0;
          hideCostPricesFromNonAdmins = false;
          scheduledSummaryFrequency = "weekly";
          lastSummaryDate = 0;
        };
      };
    };

    let freq = settings.scheduledSummaryFrequency;
    let nowNs = Time.now();
    let weekNs : Int = 7 * 24 * 60 * 60 * 1_000_000_000;
    let monthNs : Int = 30 * 24 * 60 * 60 * 1_000_000_000;

    let existingSummaries = scheduledSummaries.get(bookId).get([]);

    // Check if we have a recent valid summary
    let latestValid : ?ScheduledSummary = if (existingSummaries.size() == 0) {
      null
    } else {
      let s = existingSummaries[existingSummaries.size() - 1];
      let age = nowNs - s.generatedAt;
      let valid = if (freq == "weekly") { age < weekNs }
        else if (freq == "monthly") { age < monthNs }
        else { false };
      if (valid) { ?s } else { null };
    };

    switch (latestValid) {
      case (?s) { return #ok(s) };
      case null {};
    };

    // Generate new summary
    var totalInflows = 0.0;
    var totalExpensesAmt = 0.0;
    var grossMarginAmt = 0.0;
    var txCount = 0;
    var itemCounts = Map.empty<Text, Nat>();
    var customerAmounts = Map.empty<Text, Float>();

    let periodStart = if (freq == "weekly") { nowNs - weekNs } else { nowNs - monthNs };

    for ((_, tx) in transactions.entries()) {
      if (tx.bookId == bookId and tx.approved and tx.date >= periodStart) {
        txCount += 1;
        switch (tx.typeSubtype) {
          case "Sales" {
            totalInflows += tx.amount;
            grossMarginAmt += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
            let cur = itemCounts.get(tx.itemName).get(0);
            itemCounts.add(tx.itemName, cur + tx.cartons * tx.unitsPerCarton);
            let curCust = customerAmounts.get(tx.customerName).get(0.0);
            customerAmounts.add(tx.customerName, curCust + tx.amount);
          };
          case "Credit Sales" {
            totalInflows += tx.amount;
            grossMarginAmt += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
          };
          case _ {};
        };
      };
    };

    for ((_, exp) in expenses.entries()) {
      if (exp.bookId == bookId and exp.approved and exp.date >= periodStart) {
        totalExpensesAmt += exp.amount;
      };
    };

    // Top 5 items and customers
    let itemArr = itemCounts.entries().toArray();
    let sortedItems = itemArr.sort(func(a, b) {
      if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
    });
    let topItemCount = if (sortedItems.size() > 5) { 5 } else { sortedItems.size() };
    let topItemNames = Array.tabulate(topItemCount, func(i) { sortedItems[i].0 });

    let custArr = customerAmounts.entries().toArray();
    let sortedCusts = custArr.sort(func(a, b) {
      if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else { #equal }
    });
    let topCustCount = if (sortedCusts.size() > 5) { 5 } else { sortedCusts.size() };
    let topCustomerNames = Array.tabulate(topCustCount, func(i) { sortedCusts[i].0 });

    let periodLabel = if (freq == "weekly") { "Week ending " # nowNs.toText() }
      else { "Month ending " # nowNs.toText() };

    let summaryId = bookId # "-summary-" # nowNs.toText();
    let newSummary : ScheduledSummary = {
      id = summaryId;
      bookId;
      generatedAt = nowNs;
      periodLabel;
      totalInflows;
      totalExpenses = totalExpensesAmt;
      grossMargin = grossMarginAmt;
      topItemNames;
      topCustomerNames;
      transactionCount = txCount;
    };

    let updatedSummaries = existingSummaries.concat([newSummary]);
    scheduledSummaries.add(bookId, updatedSummaries);

    // Update lastSummaryDate in settings
    bookSettings.add(bookId, { settings with lastSummaryDate = nowNs });

    Debug.print("Generated new scheduled summary for book: " # bookId);
    #ok(newSummary);
  };

  // ─── NEW: Extended analytics API ─────────────────────────────────────────

  public shared query({ caller }) func getAnalyticsExtended(bookId : Text, timeFilter : Text) : async { #ok : AnalyticsExtended; #err : Text } {
    if (not isBookMember(caller, bookId)) {
      Debug.print("getAnalyticsExtended DENIED: " # caller.toText() # " is not a member of book " # bookId);
      return #err("Unauthorized: You must be a member of this book");
    };
    let isAdmin = isBookAdminMember(caller, bookId);
    if (not isAdmin) {
      Debug.print("getAnalyticsExtended DENIED: " # caller.toText() # " is not an admin of book " # bookId);
      return #err("Unauthorized: Only administrators can view analytics and reports");
    };
    let nowNs = Time.now();
    let dayNs : Int = 24 * 60 * 60 * 1_000_000_000;

    let startTime : Int = switch (timeFilter) {
      case "today" { nowNs - dayNs };
      case "week" { nowNs - 7 * dayNs };
      case "month" { nowNs - 30 * dayNs };
      case "year" { nowNs - 365 * dayNs };
      case "last7" { nowNs - 7 * dayNs };
      case "last30" { nowNs - 30 * dayNs };
      case "last90" { nowNs - 90 * dayNs };
      case _ { 0 };  // "all"
    };

    // Filter transactions in range
    let filteredTxs = transactions.values()
      .filter(func(tx : Transaction) : Bool {
        tx.bookId == bookId and tx.approved and tx.date >= startTime
      })
      .toArray();

    // ── Sales analytics ──────────────────────────────────────────────────────
    // Build period -> revenue/cost/profit map (group by month label)
    var periodMap = Map.empty<Text, (Float, Float, Float)>();
    for (tx in filteredTxs.values()) {
      if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
        let periodKey = (tx.date / (30 * dayNs)).toText();
        let (rev, cost, profit) = periodMap.get(periodKey).get((0.0, 0.0, 0.0));
        let txCost = tx.costPriceAtSale * (tx.cartons * tx.unitsPerCarton).toFloat();
        let txProfit = (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
        periodMap.add(periodKey, (rev + tx.amount, cost + txCost, profit + txProfit));
      };
    };
    let salesTrend : [SalesTrendPoint] = periodMap.entries().toArray()
      .map<(Text, (Float, Float, Float)), SalesTrendPoint>(func((p, v)) {
        { period = "Period " # p; revenue = v.0; cost = v.1; profit = v.2 }
      });

    // Peak periods — top 5 by revenue
    let sortedPeriods = salesTrend.sort(func(a : SalesTrendPoint, b : SalesTrendPoint) : { #less; #equal; #greater } {
      if (a.revenue > b.revenue) { #less } else if (a.revenue < b.revenue) { #greater } else { #equal }
    });
    let peakCount = if (sortedPeriods.size() > 5) { 5 } else { sortedPeriods.size() };
    let peakPeriods : [PeakPeriod] = Array.tabulate(peakCount, func(i) {
      { period = sortedPeriods[i].period; volume = sortedPeriods[i].revenue; rank = i + 1 }
    });

    // Revenue forecast: simple average of last 3 periods projected forward
    let forecastRevenue = if (salesTrend.size() > 0) {
      let n = if (salesTrend.size() > 3) { 3 } else { salesTrend.size() };
      let recent = salesTrend.sliceToArray(salesTrend.size() - n, salesTrend.size());
      recent.foldLeft(0.0, func(acc, p : SalesTrendPoint) { acc + p.revenue }) / n.toFloat()
    } else { 0.0 };
    let revenueForecast : [ForecastPoint] = [
      { period = "Next Period"; projected = forecastRevenue },
      { period = "Period +2"; projected = forecastRevenue * 1.05 },
      { period = "Period +3"; projected = forecastRevenue * 1.1 },
    ];

    // Sales velocity per item
    let daysInRange = if (startTime == 0) { 365 } else { Int.abs((nowNs - startTime) / dayNs) };
    let safedays = if (daysInRange == 0) { 1 } else { daysInRange };
    var velocityMap = Map.empty<Text, Nat>();
    for (tx in filteredTxs.values()) {
      if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
        let cur = velocityMap.get(tx.itemName).get(0);
        velocityMap.add(tx.itemName, cur + tx.cartons * tx.unitsPerCarton);
      };
    };
    let salesVelocity : [SalesVelocityItem] = velocityMap.entries().toArray()
      .map<(Text, Nat), SalesVelocityItem>(func((name, total)) {
        { itemName = name; avgUnitsPerDay = total.toFloat() / safedays.toFloat(); totalUnits = total }
      });

    // ── Inventory analytics ──────────────────────────────────────────────────
    let bookInv = inventory.values()
      .filter(func(i : InventoryItem) : Bool { i.bookId == bookId and (isAdmin or i.approved) })
      .toArray();

    // Stock turnover: units sold / current qty
    let stockTurnover : [StockTurnoverItem] = bookInv.map<InventoryItem, StockTurnoverItem>(func(item) {
      var sold = 0;
      for (tx in filteredTxs.values()) {
        if ((tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
            tx.itemName.toLower() == item.name.toLower()) {
          sold += tx.cartons * tx.unitsPerCarton;
        };
      };
      let rate = if (item.quantity > 0) { sold.toFloat() / item.quantity.toFloat() } else { sold.toFloat() };
      { itemName = item.name; turnoverRate = rate; timesRestocked = 0 }
    });

    // Dead stock: items with no sale in filter period
    let deadStock : [DeadStockItem] = bookInv
      .filter(func(item : InventoryItem) : Bool {
        filteredTxs.find(func(tx : Transaction) : Bool {
          (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
          tx.itemName.toLower() == item.name.toLower()
        }) == null
      })
      .map<InventoryItem, DeadStockItem>(func(item) {
        let daysSince = if (startTime > 0) { Int.abs((nowNs - startTime) / dayNs) } else { 0 };
        { itemName = item.name; daysSinceLastSale = daysSince; currentQty = item.quantity }
      });

    // COGS breakdown
    let cogsBreakdown : [CogsItem] = bookInv.map<InventoryItem, CogsItem>(func(item) {
      var totalCost = 0.0;
      var totalRevenue = 0.0;
      for (tx in filteredTxs.values()) {
        if ((tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
            tx.itemName.toLower() == item.name.toLower()) {
          totalCost += tx.costPriceAtSale * (tx.cartons * tx.unitsPerCarton).toFloat();
          totalRevenue += tx.amount;
        };
      };
      { itemName = item.name; totalCost; totalRevenue; grossProfit = totalRevenue - totalCost }
    });

    // Branch comparison
    let bookLocs = locations.values()
      .filter(func(l : Location) : Bool { l.bookId == bookId })
      .toArray();
    let branchComparison : [BranchComparisonItem] = bookLocs.map<Location, BranchComparisonItem>(func(loc) {
      let locItems = bookInv.filter(func(i : InventoryItem) : Bool { i.locationId == loc.id });
      let totalItems = locItems.size();
      let totalValue = locItems.foldLeft(0.0, func(acc, i : InventoryItem) {
        acc + i.costPrice * i.quantity.toFloat()
      });
      var salesVol = 0.0;
      for (tx in filteredTxs.values()) {
        if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
          salesVol += tx.amount;
        };
      };
      { locationName = loc.name; totalItems; totalValue; salesVolume = salesVol }
    });

    // ── Customer analytics ────────────────────────────────────────────────────
    let bookCusts = customers.values()
      .filter(func(c : Customer) : Bool { c.bookId == bookId })
      .toArray();

    let customerCLV : [CustomerCLVItem] = bookCusts.map<Customer, CustomerCLVItem>(func(c) {
      { customerName = c.name; totalRevenue = c.totalSpent; totalTransactions = c.transactionCount; firstTransactionDate = c.createdAt }
    });

    // Repeat vs new per period (simplified: all existing vs first-time in period)
    let newCustInPeriod = bookCusts.filter(func(c : Customer) : Bool { c.createdAt >= startTime }).size();
    let repeatCustInPeriod = if (bookCusts.size() > newCustInPeriod) { bookCusts.size() - newCustInPeriod } else { 0 };
    let repeatPct = if (bookCusts.size() > 0) { repeatCustInPeriod.toFloat() / bookCusts.size().toFloat() * 100.0 } else { 0.0 };
    let repeatVsNewRatio : [RepeatVsNewItem] = [{
      period = timeFilter;
      repeatCount = repeatCustInPeriod;
      newCount = newCustInPeriod;
      repeatPct;
    }];

    // Top customers by profit
    let topCustomersByProfit : [TopCustomerByProfit] = bookCusts
      .map<Customer, TopCustomerByProfit>(func(c) {
        var grossProfit = 0.0;
        for (tx in filteredTxs.values()) {
          if ((tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
              tx.customerName.toLower() == c.name.toLower()) {
            grossProfit += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
          };
        };
        { customerName = c.name; grossProfit; totalRevenue = c.totalSpent }
      })
      .sort(func(a : TopCustomerByProfit, b : TopCustomerByProfit) : { #less; #equal; #greater } {
        if (a.grossProfit > b.grossProfit) { #less } else if (a.grossProfit < b.grossProfit) { #greater } else { #equal }
      });

    // Debt aging (reuse aging report logic inline)
    var aging0_30 : [Transaction] = [];
    var aging31_60 : [Transaction] = [];
    var aging61_90 : [Transaction] = [];
    var aging90plus : [Transaction] = [];
    for (tx in filteredTxs.values()) {
      if (tx.typeSubtype == "Credit Sales") {
        let dueDate = tx.date + 30 * dayNs;
        if (dueDate >= nowNs) {
          // not overdue
        } else {
          let overdueDays = (nowNs - dueDate) / dayNs;
          if (overdueDays <= 30) { aging0_30 := aging0_30.concat([tx]) }
          else if (overdueDays <= 60) { aging31_60 := aging31_60.concat([tx]) }
          else if (overdueDays <= 90) { aging61_90 := aging61_90.concat([tx]) }
          else { aging90plus := aging90plus.concat([tx]) };
        };
      };
    };
    func sumAmt(txs : [Transaction]) : Float {
      txs.foldLeft(0.0, func(acc, tx : Transaction) { acc + tx.amount });
    };
    let debtAging : [AgingBucket] = [
      { bucketLabel = "0-30 days"; totalAmount = sumAmt(aging0_30); count = aging0_30.size(); transactions = aging0_30 },
      { bucketLabel = "31-60 days"; totalAmount = sumAmt(aging31_60); count = aging31_60.size(); transactions = aging31_60 },
      { bucketLabel = "61-90 days"; totalAmount = sumAmt(aging61_90); count = aging61_90.size(); transactions = aging61_90 },
      { bucketLabel = "90+ days"; totalAmount = sumAmt(aging90plus); count = aging90plus.size(); transactions = aging90plus },
    ];

    // ── Financial analytics ───────────────────────────────────────────────────
    let filteredExps = expenses.values()
      .filter(func(exp : Expense) : Bool {
        exp.bookId == bookId and exp.approved and exp.date >= startTime
      })
      .toArray();

    // Expense by category
    var expCatMap = Map.empty<Text, Float>();
    var totalExpAmt = 0.0;
    for (exp in filteredExps.values()) {
      let cur = expCatMap.get(exp.category).get(0.0);
      expCatMap.add(exp.category, cur + exp.amount);
      totalExpAmt += exp.amount;
    };
    let expenseByCategory : [ExpenseByCategoryItem] = expCatMap.entries().toArray()
      .map<(Text, Float), ExpenseByCategoryItem>(func((cat, amt)) {
        let pct = if (totalExpAmt > 0.0) { amt / totalExpAmt * 100.0 } else { 0.0 };
        { category = cat; amount = amt; pct }
      });

    // Margin trend (by period)
    let marginTrend : [MarginTrendPoint] = periodMap.entries().toArray()
      .map<(Text, (Float, Float, Float)), MarginTrendPoint>(func((p, v)) {
        let pct = if (v.0 > 0.0) { v.2 / v.0 * 100.0 } else { 0.0 };
        { period = "Period " # p; grossMarginPct = pct; grossMargin = v.2 }
      });

    // Break-even
    var totalRevenue = 0.0;
    for (tx in filteredTxs.values()) {
      if (tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") {
        totalRevenue += tx.amount;
      };
    };
    let breakEven : BreakEven = {
      totalExpenses = totalExpAmt;
      requiredRevenue = totalExpAmt;
      currentRevenue = totalRevenue;
      surplus = totalRevenue - totalExpAmt;
    };

    // Profit by product
    let profitByProduct : [ProfitByProductItem] = bookInv.map<InventoryItem, ProfitByProductItem>(func(item) {
      var grossProfit = 0.0;
      var productRevenue = 0.0;
      var units = 0;
      for (tx in filteredTxs.values()) {
        if ((tx.typeSubtype == "Sales" or tx.typeSubtype == "Credit Sales") and
            tx.itemName.toLower() == item.name.toLower()) {
          grossProfit += (tx.sellingPriceAtSale - tx.costPriceAtSale) * (tx.cartons * tx.unitsPerCarton).toFloat();
          productRevenue += tx.amount;
          units += tx.cartons * tx.unitsPerCarton;
        };
      };
      let margin = if (productRevenue > 0.0) { grossProfit / productRevenue * 100.0 } else { 0.0 };
      { itemName = item.name; grossProfit; units; margin }
    })
    .sort(func(a : ProfitByProductItem, b : ProfitByProductItem) : { #less; #equal; #greater } {
      if (a.grossProfit > b.grossProfit) { #less } else if (a.grossProfit < b.grossProfit) { #greater } else { #equal }
    });

    // ── Operational analytics ─────────────────────────────────────────────────
    // Approval turnaround: approximate from audit log
    let bookAuditEntries = auditLog.get(bookId).get([]);
    var totalApproved = 0;
    var totalRejected = 0;
    var turnaroundCount = 0;
    var turnaroundTotal = 0.0;
    var fastest = 0.0;
    var slowest = 0.0;
    for (entry in bookAuditEntries.values()) {
      if (entry.timestamp >= startTime) {
        if (entry.action == "APPROVE") {
          totalApproved += 1;
          switch (bookAuditEntries.find(func(created : AuditLogEntry) : Bool {
            created.action == "CREATE" and created.targetId == entry.targetId and created.targetType == entry.targetType and created.timestamp <= entry.timestamp
          })) {
            case null {};
            case (?created) {
              let hours = (entry.timestamp - created.timestamp).toFloat() / 3_600_000_000_000.0;
              if (turnaroundCount == 0 or hours < fastest) { fastest := hours };
              if (hours > slowest) { slowest := hours };
              turnaroundCount += 1;
              turnaroundTotal += hours;
            };
          };
        };
        if (entry.action == "REJECT") { totalRejected += 1 };
      };
    };
    let approvalTurnaround : ApprovalTurnaround = {
      avgHours = if (turnaroundCount == 0) { 0.0 } else { turnaroundTotal / turnaroundCount.toFloat() };
      fastestHours = fastest;
      slowestHours = slowest;
      totalApproved;
      totalRejected;
    };

    // User activity from audit log
    var userActivityMap = Map.empty<Text, (Nat, Int, Text)>();
    for (entry in bookAuditEntries.values()) {
      let (count, lastDate, name) = userActivityMap.get(entry.actorPrincipal).get((0, 0, entry.actorName));
      let newDate = if (entry.timestamp > lastDate) { entry.timestamp } else { lastDate };
      userActivityMap.add(entry.actorPrincipal, (count + 1, newDate, name));
    };
    let userActivity : [UserActivityItem] = userActivityMap.entries().toArray()
      .map<(Text, (Nat, Int, Text)), UserActivityItem>(func((p, v)) {
        { principalText = p; userName = v.2; actionCount = v.0; lastActionDate = v.1 }
      });

    // Transaction error rate
    var totalSubmitted = 0;
    var txApproved = 0;
    var txRejected = 0;
    for (entry in bookAuditEntries.values()) {
      if (entry.targetType == "transaction") {
        if (entry.action == "CREATE") { totalSubmitted += 1 };
        if (entry.action == "APPROVE") { txApproved += 1 };
        if (entry.action == "REJECT") { txRejected += 1 };
      };
    };
    let errorRate = if (totalSubmitted > 0) { txRejected.toFloat() / totalSubmitted.toFloat() * 100.0 } else { 0.0 };
    let transactionErrorRate : TransactionErrorRate = { totalSubmitted; totalApproved = txApproved; totalRejected = txRejected; errorRate };

    #ok({
      salesTrend;
      peakPeriods;
      revenueForecast;
      salesVelocity;
      stockTurnover;
      deadStock;
      cogsBreakdown;
      branchComparison;
      customerCLV;
      repeatVsNewRatio;
      topCustomersByProfit;
      debtAging;
      expenseByCategory;
      marginTrend;
      breakEven;
      profitByProduct;
      approvalTurnaround;
      userActivity;
      transactionErrorRate;
    });
  };
};

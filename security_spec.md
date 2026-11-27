# SmartBiz AI Firestore Security Specification

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every shop document (`/shops/{shopId}`) is keyed by the owner's authenticated Firebase UID (`shopId == request.auth.uid` and `ownerId == request.auth.uid`). No authenticated user may read, list, create, update, or delete another shop's profile, sales, expenses, inventory, or backups.
2. **Verified Identity Required**: All reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Relational Sync**: Every single-document subcollection operation (`get`, `create`, `update`, `delete`) verifies parent `/shops/{shopId}` exists and `ownerId == request.auth.uid`.
4. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
5. **Bounded Payloads & Strict Schemas**: Every string field enforces `.size()` limits, every numeric field enforces realistic business bounds, every status enum enforces strict allowlists (`Pending`, `In Progress`, `Completed` for tasks; `Active`, `On Leave`, `Inactive` for employees), and every write enforces exact `keys().hasAll(...) && keys().hasOnly(...)` allowlists.
6. **Sale & Expense Edit Integrity**: Updates to `/shops/{shopId}/sales/{saleId}` and `/shops/{shopId}/expenses/{expenseId}` require verified owner identity, parent shop ownership, immutable `ownerId` and `createdAt`, `updatedAt == request.time`, and strict `affectedKeys().hasOnly(...)` allowlists.
7. **Subscription Isolation & Paid Entitlement Gate**: `/users/{userId}/subscription/{subId}` is strictly scoped to `request.auth.uid == userId && ownerId == request.auth.uid`. Paid plans (`starter`, `business`, `premium`) require a non-empty `stripeSessionId` and 64-char `entitlementSignature` returned by the verified server-side Stripe session check.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-Tenant Read/List**: User A attempts to read `/shops/{userB_uid}/sales/sale1`, list `/shops/{userB_uid}/tasks`, or read `/users/{userB_uid}/subscription/active`.
2. **Identity Spoofing on Create**: User A writes `/shops/{userA_uid}/tasks/task1` or `/users/{userA_uid}/subscription/active` with `ownerId: userB_uid`.
3. **Ghost / Shadow Field Injection**: User A writes a `ShopProfile`, `SaleEntry`, or `TaskEntry` including extra `isAdmin: true` or `plan: "enterprise"` field.
4. **Unverified Email Spoof**: Request has `request.auth.token.email_verified == false`.
5. **Path ID Poisoning**: Document ID contains `/` or exceeds 128 chars or invalid chars (`task!@#`).
6. **Client-Forged Timestamp**: Payload supplies custom `createdAt` or `updatedAt` timestamp instead of server `request.time`.
7. **Immutable Field Tampering**: Update on `/shops/{shopId}`, `/sales/{saleId}`, `/expenses/{expenseId}`, or `/tasks/{taskId}` attempts to change `ownerId` or `createdAt`.
8. **Invalid ISO Date Format**: `SaleEntry.Date`, `ExpenseEntry.Date`, or `TaskEntry.dueDate` is `"19/11/2026"` failing `^\d{4}-\d{2}-\d{2}$`.
9. **Negative Revenue / Negative Stock / Negative Salary**: `SaleEntry.Revenue = -500`, `InventorySku.stock = -3`, or `EmployeeEntry.monthlySalary = -100`.
10. **Invalid Enum**: `TaskEntry.status = "Archived"`, `TaskEntry.priority = "Urgent"`, or `UserSubscription.planId = "unlimited"`.
11. **Paid Plan Without Stripe Proof**: User writes `/users/{uid}/subscription/active` with `planId: "premium"` without `stripeSessionId` and 64-hex `entitlementSignature`.
12. **Unscoped List Scraping**: Authenticated user queries `/shops/{shopId}/tasks` or `/shops/{shopId}/sales` without matching `ownerId == request.auth.uid`.


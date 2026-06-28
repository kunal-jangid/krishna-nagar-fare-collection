# Design Specification: RBAC and Phone Number Export

**Date:** 2026-06-27
**Status:** Draft

## 1. Objective
The goal of this task is to enhance the application's data utility and security by:
1. Adding the building's phone number to the CSV export reports.
2. Implementing a robust Role-Based Access Control (RBAC) system with three defined roles: `viewer`, `editor`, and `admin`.

---

## 2. Scope

### A. Phone Number Export
*   **Target File:** `src/utils/csvExport.ts`
*   **Goal:** Modify the CSV generation logic to include a "Phone" column in the output.

### B. Role-Based Access Control (RBAC)
*   **Target Layer 1: Database (Supabase)**
    *   Implement an automatic role assignment mechanism.
*   **Target Layer 2: Frontend State (`useUserRole` hook)**
    *   Update role definitions and fetching logic.
*   **Target Layer 3: UI/UX (Components)**
    *   Enforce permission-based visibility and interactivity (Read-only vs. Write vs. Delete).

---

## 3. Detailed Design

### A. Phone Number Export
*   **CSV Header Update:** Add `Phone` as the fourth column (after Resident Name).
*   **Row Generation:** For each building, extract `building.phone_number` and append it to the CSV row string.
*   **Data Integrity:** If `phone_number` is missing, an empty string will be used to maintain column alignment.

### B. RBAC System

#### 1. Database Level (Supabase)
*   **Roles Definition:**
    *   `viewer`: Lowest privilege.
    *   `editor`: Intermediate privilege.
    *   `admin`: Highest privilege.
*   **Auto-Assignment Trigger:**
    *   Create a PostgreSQL function/trigger on the `auth.users` table.
    *   **Logic:** On `INSERT` to `auth.users`, check if the new user's email already exists in the `user_roles` table.
    *   **Action:** If not present, insert a new record into `user_roles` with `email = new_user.email` and `role = 'viewer'`.
    *   This ensures every user is a `viewer` by default without manual intervention.

#### 2. Frontend Hook (`src/hooks/useUserRole.ts`)
*   **Type Updates:** Change the `role` state type from `'admin' | 'collector' | null` to `'admin' | 'editor' | 'viewer' | null`.
*   **Logic Update:**
    *   Update the Supabase query to fetch the new role values.
    *   Change the default fallback from `'collector'` to `'viewer'`.

#### 3. Permission Matrix & UI Enforcement

| Feature / Action | Viewer | Editor | Admin |
| :--- | :---: | :---: | :---: |
| **View Payments** | ✅ | ✅ | ✅ |
| **Log/Update Payment** | ❌ | ✅ | ✅ |
| **Delete Payment** | ❌ | ❌ | ✅ |
| **View Buildings** | ✅ | ✅ | ✅ |
| **Add/Edit Buildings** | ❌ | ✅ | ✅ |
| **Access Maintenance** | ❌ | ❌ | ✅ |

*   **UI Implementation Strategy:**
    *   Use the `useUserRole` hook in relevant components (e.g., `PaymentMatrix`, building management screens, main navigation).
    *   **Payments:** Disable/hide "Log Payment" and "Update" buttons for `viewer`. Hide "Delete" buttons for `editor` and `viewer`.
    *   **Buildings:** Disable/hide "Add Building" or "Edit Building" forms/buttons for `viewer`.
    *   **Maintenance:** Conditionally render the entry point to the maintenance panel (or the `dbMaintenance` utility triggers) only if `role === 'admin'`.

---

## 4. Implementation Plan

1.  **Phase 1: Database Migration**
    *   Create a new Supabase migration file to add the `user_roles` trigger and function.
2.  **Phase 2: Frontend Type & Hook Update**
    *   Update `src/hooks/useUserRole.ts` with new roles and fallback.
3.  **Phase 3: CSV Export Update**
    *   Update `src/utils/csvExport.ts` to include the phone number column.
4.  **Phase 4: UI Permission Enforcement**
    *   Audit and update components:
        *   `PaymentMatrix.tsx` (Log/Update/Delete permissions).
        *   Building management components (Add/Edit permissions).
        *   Main Navigation/App entry point (Maintenance panel visibility).

---

## 5. Testing Strategy

*   **Unit Tests:** Verify CSV output string contains the expected number of columns and correct data.
*   **Integration Tests (Supabase):**
    *   Create a new test user in Supabase and verify a `viewer` role is automatically assigned in `user_roles`.
    *   Manually update a user to `editor` and verify they receive correct permissions.
*   **E2E/Manual UI Testing:**
    *   **Viewer:** Log in as a viewer $ightarrow$ Ensure no "Add", "Edit", or "Delete" buttons are visible/clickable.
    *   **Editor:** Log in as an editor $ightarrow$ Ensure "Add/Edit" works, but "Delete" and "Maintenance" are unavailable.
    *   **Admin:** Log in as an admin $ightarrow$ Ensure all features (including Delete and Maintenance) are accessible.

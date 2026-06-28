# RBAC and Phone Number Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phone number to CSV export and implement a 3-tier RBAC system (viewer, editor, admin).

**Architecture:** Database trigger for automatic role assignment, updated frontend hook for role management, and component-level permission enforcement.

**Tech Stack:** Supabase (PostgreSQL), React Native (TypeScript), Expo.

## Global Constraints

*   Roles: `viewer` (read-only), `editor` (read + log/edit payments & buildings), `admin` (all + delete & maintenance).
*   Default role: `viewer`.
*   CSV format: Maintain existing structure but add "Phone" column.

---

### Task 1: Database Migration (RBAC Trigger)

**Files:**
- Create: `supabase/migrations/20260627000000_add_rbac_trigger.sql`

**Interfaces:**
- Produces: PostgreSQL function `handle_new_user_role` and trigger `on_auth_user_created`.

- [x] **Step 1: Create the migration file with the trigger logic**

```sql
-- Function to automatically assign 'viewer' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE email = NEW.email) THEN
    INSERT INTO public.user_roles (email, role)
    VALUES (NEW.email, 'viewer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
```

- [x] **Step 2: Commit the migration**

```bash
git add supabase/migrations/20260627000000_add_rbac_trigger.sql
git commit -m "feat: add automatic viewer role assignment trigger"
```

---

### Task 2: Frontend Hook Update

**Files:**
- Modify: `src/hooks/useUserRole.ts`

**Interfaces:**
- Consumes: `supabase` client.
- Produces: Updated `useUserRole` hook returning `'admin' | 'editor' | 'viewer' | null`.

- [x] **Step 1: Update role types and default fallback**

```typescript
// src/hooks/useUserRole.ts

// ... existing imports

export const useUserRole = () => {
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
// ...
        if (data && !error) {
          setRole(data.role as 'admin' | 'editor' | 'viewer');
        } else {
          setRole('viewer'); // Default fallback
        }
// ...
```

- [x] **Step 2: Commit the change**

```bash
git add src/hooks/useUserRole.ts
git commit -m "refactor: update user roles to viewer, editor, admin"
```

---

### Task 3: CSV Export Update

**Files:**
- Modify: `src/utils/csvExport.ts`

**Interfaces:**
- Consumes: `BuildingData[]`, `PaymentLog[]`.
- Produces: Updated CSV string with Phone column.

- [x] **Step 1: Update CSV Header and Row generation**

```typescript
// src/utils/csvExport.ts

// ... 
export const exportFactorToCSV = async (
  factorId: number, 
  factorLabel: string, 
  buildings: BuildingData[], 
  paymentLogs: PaymentLog[]
) => {
  // 1. Generate CSV Header
  let csvContent = `House No,Resident Name,Phone,Row,Col,${MONTHS.join(',')},Total
`;
// ...
    let rowStr = `${building.house_no},${building.owner_name},${building.phone_number || ''},${building.row},${building.col},`;
// ...
```

- [x] **Step 2: Commit the change**

```bash
git add src/utils/csvExport.ts
git commit -m "feat: add phone number to CSV export"
```

---

### Task 4: UI Permission Enforcement (PaymentMatrix)

**Files:**
- Modify: `src/components/ui/PaymentMatrix.tsx`

**Interfaces:**
- Consumes: `useUserRole` hook.
- Produces: UI with restricted access based on role.

- [x] **Step 1: Implement permission logic in PaymentMatrix**

```typescript
// src/components/ui/PaymentMatrix.tsx

// ...
const PaymentMatrix = ({
// ...
}) => {
// ...
  const { role: userRole } = useUserRole();
  const isEditor = userRole === 'editor' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  // Update handleOpenLog and other interaction handlers to check isEditor
  const handleOpenLog = (month: number) => {
    if (!isEditor) return;
    // ... existing logic
  };

  // In the render part, ensure buttons are only visible/enabled if permitted
  // e.g. if (!isEditor) return null for certain UI elements or use disabled prop
// ...
```

- [x] **Step 2: Commit the change**

```bash
git add src/components/ui/PaymentMatrix.tsx
git commit -m "feat: enforce payment logging and deletion permissions"
```

---

### Task 5: Maintenance and Building Access (Audit)

**Files:**
- Audit: `App.tsx`, `src/components/Auth.tsx`, and any other components using maintenance/building management.

- [x] **Step 1: Implement Maintenance visibility check**
- [x] **Step 2: Implement Building management visibility check**
- [x] **Step 3: Commit changes**

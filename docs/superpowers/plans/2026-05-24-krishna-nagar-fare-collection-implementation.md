# Krishna Nagar Fare Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android app using Expo, React Three Fiber, and Supabase to track building payments in a 3D visualization.

**Architecture:** A modular React Native app with a 3D scene layer using R3F, a Material 3 UI layer using react-native-paper, and a Supabase backend for data persistence and authentication.

**Tech Stack:** Expo, TypeScript, @react-three/fiber, three, supabase-js, react-native-paper, expo-camera, expo-image-picker.

---

## File Structure

- `src/constants/laneMap.ts`: The 5x30 lane matrix and layout constants.
- `src/types/database.types.ts`: Supabase generated types and application types.
- `src/lib/supabase.ts`: Supabase client configuration.
- `src/components/3d/Scene.tsx`: Main 3D canvas and environment setup.
- `src/components/3d/Building.tsx`: Interactive 3D building primitive.
- `src/components/ui/BuildingOverlay.tsx`: Material 3 bottom sheet for details.
- `src/components/ui/PaymentMatrix.tsx`: Grid showing payment history for factors.
- `src/hooks/useBuildingData.ts`: React Query/Hook for syncing building state.
- `src/services/imageService.ts`: Helper for camera/storage uploads.

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`

- [x] **Step 1: Initialize Expo Project**

Run: `npx create-expo-app@latest . -t expo-template-blank-typescript`
Expected: Project initialized with TypeScript.

- [x] **Step 2: Install Core Dependencies**

Run: `npx expo install @react-three/fiber three @types/three @react-three/drei react-native-paper react-native-vector-icons @supabase/supabase-js expo-camera expo-image-picker expo-image`
Expected: Dependencies installed successfully.

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "chore: initialize expo project with dependencies"
```

### Task 2: Supabase Backend Setup

**Files:**
- Create: `supabase/migrations/20260524000000_init.sql`

- [x] **Step 1: Create SQL Migration for Tables**

```sql
-- Create tables as per design spec
CREATE TABLE app_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factor_1_label text DEFAULT 'Security Guard',
  factor_2_label text DEFAULT 'Thing 1',
  factor_3_label text DEFAULT 'Thing 2'
);

CREATE TABLE buildings (
  building_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_no text,
  owner_name text,
  row int NOT NULL,
  col int NOT NULL,
  floors int DEFAULT 1,
  image_url text
);

CREATE TABLE payment_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id uuid REFERENCES buildings(building_id),
  factor_id int CHECK (factor_id IN (1, 2, 3)),
  amount decimal,
  month int CHECK (month BETWEEN 1 AND 12),
  year int,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

- [x] **Step 2: Initialize Supabase Client**

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [x] **Step 3: Commit**

```bash
git add supabase/ src/lib/supabase.ts
git commit -m "feat: setup supabase tables and client"
```

### Task 3: Lane Map and Types

**Files:**
- Create: `src/constants/laneMap.ts`
- Create: `src/types/index.ts`

- [x] **Step 1: Define Lane Matrix**

Create `src/constants/laneMap.ts`:
```typescript
export const LANE_MAP = [
  [0, 1, 0, 1, 0, 1, 0],
  // ... (Full 30 rows as per spec)
];

export const GRID_SIZE = { rows: 30, cols: 7 };
export const UNIT_SIZE = 1;
```

- [x] **Step 2: Define Types**

Create `src/types/index.ts`:
```typescript
export interface BuildingData {
  building_id: string;
  house_no: string;
  owner_name: string;
  row: number;
  col: number;
  floors: number;
  image_url?: string;
}

export interface PaymentLog {
  factor_id: 1 | 2 | 3;
  month: number;
  year: number;
}
```

- [x] **Step 3: Commit**

```bash
git add src/constants/ src/types/
git commit -m "feat: define lane map and types"
```

### Task 4: 3D Scene - Ground and Grid

**Files:**
- Create: `src/components/3d/Scene.tsx`
- Modify: `App.tsx`

- [x] **Step 1: Create Basic Scene**

Create `src/components/3d/Scene.tsx`:
```typescript
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

export const Scene = ({ children }: { children: React.ReactNode }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Grid infiniteGrid fadeDistance={50} sectionSize={1} />
      {children}
      <OrbitControls />
    </Canvas>
  );
};
```

- [x] **Step 2: Integrate Scene in App**

Modify `App.tsx` to render the `Scene`.

- [x] **Step 3: Commit**

```bash
git add src/components/3d/Scene.tsx App.tsx
git commit -m "feat: setup basic 3D scene with grid and controls"
```

### Task 5: Interactive 3D Building Component

**Files:**
- Create: `src/components/3d/Building.tsx`

- [x] **Step 1: Implement Building Primitive**

Create `src/components/3d/Building.tsx`:
```typescript
import React from 'react';
import { MeshProps } from '@react-three/fiber';

interface BuildingProps extends MeshProps {
  floors: number;
  isRed?: boolean;
  onPress: () => void;
}

export const Building = ({ floors, isRed, onPress, ...props }: BuildingProps) => {
  const height = floors * 0.5;
  return (
    <mesh {...props} onClick={onPress}>
      <boxGeometry args={[0.8, height, 0.8]} />
      <meshStandardMaterial color={isRed ? '#ff4444' : '#ffffff'} />
    </mesh>
  );
};
```

- [x] **Step 2: Render Buildings from LANE_MAP**

Update `Scene.tsx` to map over `LANE_MAP` and render `Building` components.

- [x] **Step 3: Commit**

```bash
git add src/components/3d/Building.tsx src/components/3d/Scene.tsx
git commit -m "feat: add interactive building components to scene"
```

### Task 6: Building Detail Overlay (Material 3)

**Files:**
- Create: `src/components/ui/BuildingOverlay.tsx`

- [x] **Step 1: Create Modal/BottomSheet Overlay**

Using `react-native-paper`, create an overlay that shows building details (House No, Owner).

- [x] **Step 2: Integrate Overlay with Scene Interaction**

When a building is clicked in the 3D scene, open the overlay with the corresponding building's data.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/BuildingOverlay.tsx
git commit -m "feat: implement building detail overlay"
```

### Task 7: Payment Matrix and Logging

**Files:**
- Create: `src/components/ui/PaymentMatrix.tsx`

- [x] **Step 1: Implement Payment History Grid**

Render a 3x12 grid (Factors x Months) showing payment status.

- [x] **Step 2: Add Payment Logging Form**

A simple form to select factor, month, and amount, then call `supabase.from('payment_logs').insert(...)`.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/PaymentMatrix.tsx
git commit -m "feat: add payment history and logging"
```

### Task 8: Status Logic and Final Polish

**Files:**
- Modify: `src/hooks/useBuildingData.ts`
- Modify: `src/components/3d/Building.tsx`

- [x] **Step 1: Implement "Unpaid" Red Status Logic**

Fetch payments for the previous month. If any building is missing a payment for any factor, set `isRed = true`.

- [x] **Step 2: Camera Integration for Images**

Implement image picker/camera service to update `image_url` in `buildings` table and upload to Supabase Storage.

- [x] **Step 3: Final Verification and Commit**

```bash
git add .
git commit -m "feat: implement status logic and camera integration"
```

# Design Document: Krishna Nagar Fare Collection App

**Date:** 2026-05-24  
**Status:** Draft  
**Target Platform:** Android (via Expo/React Native)

## 1. Overview
A specialized Android application for managing fare/rent collection in the Krishna Nagar area. The app features a high-performance 3D visualization of a 5x30 lane grid where buildings are represented by abstract low-poly blocks. Each building tracks three customizable payment factors (e.g., Security, Thing 1, Thing 2) with status-based coloring.

## 2. Technical Stack
- **Framework:** Expo (React Native) + TypeScript
- **3D Engine:** `@react-three/fiber` (Three.js for React)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI Components:** `react-native-paper` (Material 3 / Material You)
- **Camera:** `expo-camera` / `expo-image-picker`

## 3. Data Model

### Supabase Tables

#### `app_config`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Configuration identifier |
| `factor_1_label` | text | Default: "Security Guard" |
| `factor_2_label` | text | Default: "Thing 1" |
| `factor_3_label` | text | Default: "Thing 2" |

#### `buildings`
| Field | Type | Description |
| :--- | :--- | :--- |
| `building_id` | uuid (PK) | Stable internal ID |
| `house_no` | text | Government/Postal house number (can change) |
| `owner_name` | text | Name of the resident/owner |
| `row` | int | Grid row (0-29) |
| `col` | int | Grid column (0-4) |
| `floors` | int | Number of floors (1-4) |
| `image_url` | text | URL to Supabase Storage |

#### `payment_logs`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid (PK) | Log identifier |
| `building_id` | uuid (FK) | Reference to buildings |
| `factor_id` | int | 1, 2, or 3 |
| `amount` | decimal | Amount paid |
| `month` | int | Payment month (1-12) |
| `year` | int | Payment year |
| `created_by` | uuid (FK) | Reference to Supabase Auth User |
| `created_at` | timestamp | Automatically set on submission |

## 4. 3D Visualization Logic

### The Lane Grid
A constant 5x30 matrix defines the initial structure:
```typescript
const LANE_MAP = [
  [0, 1, 0, 1, 0, 1, 0], // Example snippet
  // ... full 5x30 matrix
];
```
*Note: The user provided a 7-column wide matrix in the example, which we will adapt to the specified grid dimensions.*

### Rendering Rules
- **0 Value:** Render empty space/ground tile.
- **1-4 Value:** Render a `Box` geometry.
- **Height:** `floors * UNIT_HEIGHT`.
- **Coloring:**
    - **Default:** Minimal Material Gray/White.
    - **Red Status:** Applied if ANY of the 3 factors were not paid in the previous month.
- **Interactivity:** Raycasting (via `@react-three/fiber`) detects taps on buildings to open the details overlay.

## 5. User Interface (Material Expressive)

### Main Scene
- OrbitControls for panning, zooming, and rotating the lane.
- A toggle to switch between "Status View" (Red/Normal) and "Neutral View".

### Building Detail Overlay (BottomSheet/Modal)
- **Header:** House Number + Owner Name.
- **Visuals:** Building image from storage (click to update via Camera).
- **Payment Matrix:** 
    - A 3-row (factors) by X-column (months) grid.
    - Colored indicators (Green for paid, Gray for unpaid).
- **Actions:** "Log Payment" button opens a form for the current user to record a transaction.

## 6. Security & Management
- **Auth:** Managed access via Supabase Auth. Only authorized collectors can log in.
- **Policies:** RLS (Row Level Security) on Supabase ensures only authenticated users can write logs or upload images.

## 7. Performance Optimization
- **Instanced Mesh:** If performance lags, buildings will be rendered using `InstancedMesh` to reduce draw calls.
- **Asset Loading:** Use `@react-three/drei`'s `useProgress` for smooth scene entry.
- **Image Caching:** Use `expo-image` for high-performance image rendering in the UI.

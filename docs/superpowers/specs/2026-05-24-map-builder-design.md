# Design Document: Lane Map Builder Web Utility

**Date:** 2026-05-24  
**Status:** Approved  
**Target Platform:** Web Browser (Standalone Static App)

## 1. Overview
A standalone, single-page web utility designed to visually generate the constant matrix (`LANE_MAP`) used by the Krishna Nagar Fare Collection mobile app. This solves the pain point of manually typing out large 2D arrays (e.g., 30x7 or 60x7) of building floor counts.

## 2. Technical Stack
- **Framework:** React + Vite (chosen over Next.js for absolute minimalism and instant static builds).
- **Styling:** Tailwind CSS (via CDN or minimal setup to avoid bloat).
- **Language:** TypeScript.

## 3. Architecture & Location
- To prevent bloating the main mobile app, this tool will reside in a dedicated subdirectory: `tools/map-builder/`.
- It will be completely decoupled from the Expo project's dependencies.

## 4. User Interface & Interaction

### The Grid
- A visual representation of the grid (defaulting to 30 rows, 7 columns).
- **Interaction:** "Cycle Mode". Clicking a cell increments its integer value from 0 up to 5, then resets to 0.
- **Visual Feedback:** 
  - `0` (Empty): Light grey background, empty text.
  - `1-5` (Building): Distinct color (e.g., blue) with the integer clearly visible in the center.

### Controls
- **Add Row Button:** Appends a new row of `0`s to the bottom of the grid, allowing the map to scale to 50-60 buildings.
- **Remove Row Button:** Removes the last row.

### Export Functionality
- An "Export laneMap.ts" button.
- Reads the current React state (the 2D array).
- Generates a string formatted as valid TypeScript code:
  ```typescript
  export const LANE_MAP = [
    [0, 1, 0, 1, 0, 1, 0],
    // ...
  ];
  export const GRID_SIZE = { rows: X, cols: 7 };
  export const UNIT_SIZE = 1;
  ```
- Triggers a browser download of the generated file.

## 5. State Management
- A single `useState` hook holding a `number[][]`.

## 6. Constraints
- The tool must be extremely lightweight. No complex routing or heavy UI libraries.

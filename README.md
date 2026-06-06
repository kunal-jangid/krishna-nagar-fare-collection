# Krishna Nagar Collections

A React Native application for managing neighborhood collections, subscriptions, and resident data using a dynamic 2D/3D grid interface.

## 🌟 Features

*   **Interactive Neighborhood Map:** Switch seamlessly between a 3D isometric view (via Three.js) and a 2D grid view to visualize the neighborhood.
*   **Dynamic Data Tracking:** Track up to 3 custom factors (e.g., Security Guard, Water, Electricity) per house.
*   **Resident Management:** Store resident names, house numbers, contact numbers, and building photos.
*   **One-Tap Communication:** Call or WhatsApp residents directly from their house profile.
*   **Cloud Synchronization:** Built on Supabase for real-time data persistence and background syncing.
*   **Offline Support:** Caches building data and images locally so the app works even in low-connectivity areas.
*   **Export & Reporting:** Export monthly collection data directly to CSV.

## 🛠️ Tech Stack

*   **Framework:** [Expo](https://expo.dev/) (React Native)
*   **3D Rendering:** `@react-three/fiber` & `@react-three/drei`
*   **UI Components:** `react-native-paper`
*   **Database & Auth:** [Supabase](https://supabase.com/)
*   **Routing/Deep Linking:** `expo-linking` & `expo-auth-session`

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   Expo CLI
*   A Supabase project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/krishna-nagar-collections.git
    cd krishna-nagar-collections
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```

4.  **Run the app:**
    ```bash
    npx expo start
    ```

## ☁️ Building with EAS

This project is configured to be built using Expo Application Services (EAS). 
A GitHub Actions workflow is included to automate production builds.

To build locally:
```bash
eas build --platform android --profile preview
```

## 🧰 Maintenance Tools

A hidden maintenance menu is available in the app (Long-press the "Collection" text).
Alternatively, you can manage the database via the included CLI tool:
```bash
node tools/maintenance/maintenance.js backup
node tools/maintenance/maintenance.js reset --confirm
```

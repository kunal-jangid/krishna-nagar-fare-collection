import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { Scene } from './src/components/3d/Scene';
import { BuildingOverlay } from './src/components/ui/BuildingOverlay';
import { BuildingData } from './src/types';

export default function App() {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const handleBuildingPress = (row: number, col: number) => {
    // In a real app, we'd fetch the building data from Supabase here.
    // For now, we'll use placeholder data.
    const mockBuilding: BuildingData = {
      building_id: `${row}-${col}`,
      house_no: `HN-${row}-${col}`,
      owner_name: `Resident ${row}-${col}`,
      row,
      col,
      floors: 2, // Default
    };
    setSelectedBuilding(mockBuilding);
    setOverlayVisible(true);
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Scene onBuildingPress={handleBuildingPress} />
        
        <BuildingOverlay
          visible={overlayVisible}
          onDismiss={() => setOverlayVisible(false)}
          building={selectedBuilding}
          onUpdateImage={() => console.log('Update Image')}
          onLogPayment={() => console.log('Log Payment')}
        />

        <StatusBar style="auto" />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

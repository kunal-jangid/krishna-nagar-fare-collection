import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { Scene } from './src/components/3d/Scene';
import { BuildingOverlay } from './src/components/ui/BuildingOverlay';
import { BuildingData } from './src/types';
import { useBuildingData } from './src/hooks/useBuildingData';
import { uploadBuildingImage } from './src/services/imageService';

export default function App() {
  const { buildings, paymentLogs, config, logPayment, isBuildingRed, refresh } = useBuildingData();
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const handleBuildingPress = (row: number, col: number) => {
    let building = buildings.find(b => b.row === row && b.col === col);
    
    if (!building) {
      // Mock for local testing if not in DB
      building = {
        building_id: `${row}-${col}`,
        house_no: `HN-${row}-${col}`,
        owner_name: `Resident ${row}-${col}`,
        row,
        col,
        floors: 2,
      };
    }
    
    setSelectedBuilding(building);
    setOverlayVisible(true);
  };

  const handleUpdateImage = async () => {
    if (selectedBuilding) {
      const newUrl = await uploadBuildingImage(selectedBuilding.building_id);
      if (newUrl) {
        setSelectedBuilding({ ...selectedBuilding, image_url: newUrl });
        refresh();
      }
    }
  };

  const handleLogPayment = async (factorId: 1 | 2 | 3, month: number, amount: number) => {
    if (selectedBuilding) {
      await logPayment(selectedBuilding.building_id, factorId, month, amount);
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Scene 
          onBuildingPress={handleBuildingPress} 
          buildings={buildings}
          isBuildingRed={isBuildingRed}
        />
        
        <BuildingOverlay
          visible={overlayVisible}
          onDismiss={() => setOverlayVisible(false)}
          building={selectedBuilding}
          logs={paymentLogs.filter(l => l.building_id === selectedBuilding?.building_id)}
          config={config}
          onUpdateImage={handleUpdateImage}
          onLogPayment={handleLogPayment}
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

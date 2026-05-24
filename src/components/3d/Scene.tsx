import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { StyleSheet, View } from 'react-native';
import { LANE_MAP } from '../../constants/laneMap';
import { Building } from './Building';
import { BuildingData } from '../../types';

interface SceneProps {
  onBuildingPress: (row: number, col: number) => void;
  buildings: BuildingData[];
  isBuildingRed: (buildingId: string) => boolean;
}

export const Scene = ({ onBuildingPress, buildings, isBuildingRed }: SceneProps) => {
  const getBuildingAt = (row: number, col: number) => {
    return buildings.find(b => b.row === row && b.col === col);
  };

  return (
    <View style={styles.container}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <color attach="background" args={['#f8f9fa']} />
        <ambientLight intensity={1.5} />
        <pointLight position={[20, 20, 20]} intensity={1.2} />
        <Grid 
          infiniteGrid 
          fadeDistance={100} 
          sectionSize={1} 
          cellColor="#dee2e6"
          sectionColor="#adb5bd"
        />
        
        {LANE_MAP.map((rowArr, rowIndex) => 
          rowArr.map((floors, colIndex) => {
            if (floors === 0) return null;
            const building = getBuildingAt(rowIndex, colIndex);
            return (
              <Building
                key={`${rowIndex}-${colIndex}`}
                position={[colIndex - 3, 0, rowIndex - 15]}
                floors={floors}
                onPress={() => onBuildingPress(rowIndex, colIndex)}
                isRed={building ? isBuildingRed(building.building_id) : false}
                houseNo={building?.house_no || `${rowIndex}-${colIndex}`}
              />
            );
          })
        )}

        <OrbitControls makeDefault />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

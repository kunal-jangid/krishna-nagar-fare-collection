import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { StyleSheet, View } from 'react-native';
import { LANE_MAP } from '../../constants/laneMap';
import { Building } from './Building';
import { BuildingData } from '../../types';

import { StatusType } from '../../hooks/useBuildingData';

interface SceneProps {
  onBuildingPress: (row: number, col: number) => void;
  buildings: BuildingData[];
  buildingMap: Map<string, BuildingData>;
  getBuildingStatus: (buildingId: string, factorId: number) => StatusType;
  activeFactorId: number;
}

export const Scene = ({ 
  onBuildingPress, 
  buildings, 
  buildingMap, 
  getBuildingStatus, 
  activeFactorId 
}: SceneProps) => {

  const renderedBuildings = useMemo(() => {
    return LANE_MAP.flatMap((rowArr, rowIndex) => 
      rowArr.map((floors, colIndex) => {
        if (floors === 0) return null;
        
        const buildingKey = `${rowIndex}-${colIndex}`;
        const building = buildingMap.get(buildingKey);
        
        const status = building ? getBuildingStatus(building.building_id, activeFactorId) : 'grey';

        return (
          <Building
            key={buildingKey}
            position={[colIndex - 3, 0, rowIndex - 15]}
            floors={floors}
            onPress={() => onBuildingPress(rowIndex, colIndex)}
            status={status}
          />
        );
      })
    ).filter(Boolean);
  }, [buildingMap, getBuildingStatus, activeFactorId, onBuildingPress]);

  return (
    <View style={styles.container}>
      <Canvas 
        camera={{ position: [15, 15, 15], fov: 50 }}
        shadows={false}
        gl={{ antialias: false }}
      >
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
        
        {renderedBuildings}

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

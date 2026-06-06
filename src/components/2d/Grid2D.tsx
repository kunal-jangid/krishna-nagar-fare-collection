import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { LANE_MAP } from '../../constants/laneMap';
import { UI_CONSTANTS } from '../../constants/config';
import { BuildingData } from '../../types';
import { StatusType } from '../../hooks/useBuildingData';

interface Grid2DProps {
  onBuildingPress: (row: number, col: number) => void;
  buildings: BuildingData[];
  buildingMap: Map<string, BuildingData>;
  getBuildingStatus: (buildingId: string, factorId: number) => StatusType;
  activeFactorId: number;
}

const CELL_SIZE = 45;

const GridCell = memo(({ 
  row, 
  col, 
  floors, 
  status, 
  onPress, 
  houseNo 
}: { 
  row: number, 
  col: number, 
  floors: number, 
  status: StatusType, 
  onPress: () => void,
  houseNo?: string
}) => {
  if (floors === 0) return <View style={styles.emptyCell} />;

  const bgColor = status === 'green' 
    ? UI_CONSTANTS.GREEN_STATUS_COLOR 
    : status === 'grey' 
      ? UI_CONSTANTS.GREY_STATUS_COLOR 
      : UI_CONSTANTS.RED_STATUS_COLOR;

  return (
    <TouchableOpacity 
      style={[styles.cell, { backgroundColor: bgColor }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.houseText} numberOfLines={1}>{houseNo || `${row}-${col}`}</Text>
      <Text style={styles.floorText}>{floors}F</Text>
    </TouchableOpacity>
  );
});

export const Grid2D = ({ 
  onBuildingPress, 
  buildingMap, 
  getBuildingStatus, 
  activeFactorId 
}: Grid2DProps) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {LANE_MAP.map((rowArr, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {rowArr.map((floors, colIndex) => {
              const buildingKey = `${rowIndex}-${colIndex}`;
              const building = buildingMap.get(buildingKey);
              
              // If mock building, default status logic handled in hook or we can default to red
              const status = building 
                ? getBuildingStatus(building.building_id, activeFactorId) 
                : 'grey';
              
              return (
                <GridCell
                  key={colIndex}
                  row={rowIndex}
                  col={colIndex}
                  floors={floors}
                  status={status}
                  onPress={() => onBuildingPress(rowIndex, colIndex)}
                  houseNo={building?.house_no}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    padding: 20,
    paddingBottom: 120, // Added padding to clear the floating widget
    alignItems: 'center',
  },
  grid: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 2,
  },
  houseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  floorText: {
    color: '#fff',
    fontSize: 9,
    opacity: 0.9,
  },
});

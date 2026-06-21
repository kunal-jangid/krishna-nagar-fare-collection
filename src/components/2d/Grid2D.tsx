import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Dimensions } from 'react-native';
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

const CELL_SIZE = 50;
const CELL_MARGIN = 2;
const TOTAL_CELL_SIZE = CELL_SIZE + (CELL_MARGIN * 2);

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
  // Flatten the 2D LANE_MAP into a 1D array for FlatList
  const flatData = useMemo(() => {
    return LANE_MAP.flatMap((rowArr, rowIndex) =>
      rowArr.map((floors, colIndex) => ({
        key: `${rowIndex}-${colIndex}`,
        rowIndex,
        colIndex,
        floors,
      }))
    );
  }, []);

  const numColumns = LANE_MAP[0]?.length || 1;

  const renderItem = ({ item }: { item: typeof flatData[0] }) => {
    const building = buildingMap.get(item.key);
    const status = building
      ? getBuildingStatus(building.building_id, activeFactorId)
      : 'grey';

    return (
      <GridCell
        row={item.rowIndex}
        col={item.colIndex}
        floors={item.floors}
        status={status}
        onPress={() => onBuildingPress(item.rowIndex, item.colIndex)}
        houseNo={building?.house_no}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          numColumns={numColumns}
          contentContainerStyle={styles.content}
          initialNumToRender={100}
          maxToRenderPerBatch={100}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    padding: 10,
    paddingBottom: 120,
    alignItems: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
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
    margin: CELL_MARGIN,
  },
  houseText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  floorText: {
    color: '#fff',
    fontSize: 9,
    opacity: 0.9,
  },
});

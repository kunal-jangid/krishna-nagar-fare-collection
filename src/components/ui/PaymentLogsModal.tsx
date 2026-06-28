import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Modal, Portal, Text, Button, Card, Searchbar, SegmentedButtons } from 'react-native-paper';
import { PaymentLog, BuildingData, AppConfig } from '../../types';

interface PaymentLogsModalProps {
  visible: boolean;
  onDismiss: () => void;
  paymentLogs: PaymentLog[];
  buildings: BuildingData[];
  config: AppConfig;
}

const MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentLogsModal = ({
  visible,
  onDismiss,
  paymentLogs,
  buildings,
  config,
}: PaymentLogsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [factorFilter, setFactorFilter] = useState('all');

  // Lookup map for building details
  const buildingLookup = useMemo(() => {
    const map = new Map<string, BuildingData>();
    buildings.forEach(b => map.set(b.building_id, b));
    return map;
  }, [buildings]);

  // Helper to resolve building details robustly
  const resolveBuilding = (buildingId: string) => {
    const b = buildingLookup.get(buildingId);
    if (b) return b;
    // Fallback if buildingId is a coordinate format "row-col"
    const parts = buildingId.split('-');
    if (parts.length === 2) {
      const row = parseInt(parts[0]);
      const col = parseInt(parts[1]);
      return buildings.find(x => x.row === row && x.col === col);
    }
    return null;
  };

  const formatTimestamp = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Sort logs by created_at descending (latest first)
  const sortedLogs = useMemo(() => {
    return [...paymentLogs].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [paymentLogs]);

  // Filtered logs based on search query and factor filter
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter(log => {
      const building = resolveBuilding(log.building_id);
      const houseNo = building?.house_no || '';
      const ownerName = building?.owner_name || '';
      const updater = log.created_by_name || log.created_by || '';
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        houseNo.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query) ||
        updater.toLowerCase().includes(query);

      const matchesFactor = factorFilter === 'all' || log.factor_id.toString() === factorFilter;

      return matchesSearch && matchesFactor;
    });
  }, [sortedLogs, searchQuery, factorFilter, buildings]);

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.columnHeader, { width: 80 }]}>
        <Text style={styles.headerText}>House No</Text>
      </View>
      <View style={[styles.columnHeader, { width: 130 }]}>
        <Text style={styles.headerText}>Resident Name</Text>
      </View>
      <View style={[styles.columnHeader, { width: 110 }]}>
        <Text style={styles.headerText}>Updater</Text>
      </View>
      <View style={[styles.columnHeader, { width: 80 }]}>
        <Text style={styles.headerText}>Amount</Text>
      </View>
      <View style={[styles.columnHeader, { width: 80 }]}>
        <Text style={styles.headerText}>Collection</Text>
      </View>
      <View style={[styles.columnHeader, { width: 60 }]}>
        <Text style={styles.headerText}>Month</Text>
      </View>
      <View style={[styles.columnHeader, { width: 60 }]}>
        <Text style={styles.headerText}>Year</Text>
      </View>
      <View style={[styles.columnHeader, { width: 140, borderRightWidth: 0 }]}>
        <Text style={styles.headerText}>Timestamp</Text>
      </View>
    </View>
  );

  const renderRow = ({ item, index }: { item: PaymentLog; index: number }) => {
    const building = resolveBuilding(item.building_id);
    const houseNo = building?.house_no || `HN-${item.building_id}`;
    const ownerName = building?.owner_name || 'N/A';
    const updater = item.created_by_name || item.created_by || 'System';
    const factorLabel = 
      item.factor_id === 1 ? config.factor_1_label :
      item.factor_id === 2 ? config.factor_2_label :
      config.factor_3_label;

    const rowBg = index % 2 === 0 ? '#ffffff' : '#f9f9fa';

    return (
      <View style={[styles.tableRow, { backgroundColor: rowBg }]}>
        <View style={[styles.cell, { width: 80 }]}>
          <Text style={styles.cellText}>{houseNo}</Text>
        </View>
        <View style={[styles.cell, { width: 130 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{ownerName}</Text>
        </View>
        <View style={[styles.cell, { width: 110 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{updater}</Text>
        </View>
        <View style={[styles.cell, { width: 80 }]}>
          <Text style={[styles.cellText, styles.amountText]}>₹{item.amount}</Text>
        </View>
        <View style={[styles.cell, { width: 80 }]}>
          <Text style={styles.cellText} numberOfLines={1}>{factorLabel}</Text>
        </View>
        <View style={[styles.cell, { width: 60 }]}>
          <Text style={styles.cellText}>{MONTHS_ABBR[item.month - 1]}</Text>
        </View>
        <View style={[styles.cell, { width: 60 }]}>
          <Text style={styles.cellText}>{item.year}</Text>
        </View>
        <View style={[styles.cell, { width: 140, borderRightWidth: 0 }]}>
          <Text style={styles.cellText}>{formatTimestamp(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            <Text variant="headlineSmall" style={styles.title}>Payment Logs</Text>
            
            <Searchbar
              placeholder="Search House No, Resident, Updater..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              dense
            />

            <SegmentedButtons
              value={factorFilter}
              onValueChange={setFactorFilter}
              style={styles.filterButtons}
              buttons={[
                { value: 'all', label: 'All' },
                { value: '1', label: config.factor_1_label, labelStyle: styles.filterLabel },
                { value: '2', label: config.factor_2_label, labelStyle: styles.filterLabel },
                { value: '3', label: config.factor_3_label, labelStyle: styles.filterLabel },
              ]}
            />

            <View style={styles.tableWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableBody}>
                  {renderHeader()}
                  
                  {filteredLogs.length > 0 ? (
                    <FlatList
                      data={filteredLogs}
                      renderItem={renderRow}
                      keyExtractor={item => item.id}
                      initialNumToRender={15}
                      maxToRenderPerBatch={15}
                      contentContainerStyle={{ paddingBottom: 16 }}
                      showsVerticalScrollIndicator={true}
                    />
                  ) : (
                    <View style={styles.emptyState}>
                      <Text variant="bodyLarge" style={styles.emptyText}>No payment logs found</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button mode="contained" onPress={onDismiss}>Close</Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    maxHeight: '90%',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchbar: {
    marginBottom: 10,
    backgroundColor: '#f1f3f5',
    elevation: 0,
    borderRadius: 8,
  },
  filterButtons: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 10,
  },
  tableWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableBody: {
    flexDirection: 'column',
    height: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  columnHeader: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#495057',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },
  cellText: {
    color: '#343a40',
    fontSize: 12,
  },
  amountText: {
    fontWeight: '600',
    color: '#2b8a3e',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#868e96',
  },
  actions: {
    padding: 12,
    justifyContent: 'flex-end',
  },
});

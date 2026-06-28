import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Modal, Portal, Text, Button, Card, Searchbar, SegmentedButtons, DataTable } from 'react-native-paper';
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
  const [residentQuery, setResidentQuery] = useState('');
  const [factorFilter, setFactorFilter] = useState('all');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [numberOfItemsPerPageList] = useState([10, 20, 50]);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Filtered logs based on search query, resident query and factor filter
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter(log => {
      const building = resolveBuilding(log.building_id);
      const houseNo = building?.house_no || '';
      const ownerName = building?.owner_name || '';
      const updater = log.created_by_name || log.created_by || '';
      
      const generalQuery = searchQuery.toLowerCase();
      const resQuery = residentQuery.toLowerCase();
      
      const matchesSearch = 
        houseNo.toLowerCase().includes(generalQuery) ||
        ownerName.toLowerCase().includes(generalQuery) ||
        updater.toLowerCase().includes(generalQuery);

      const matchesResident = ownerName.toLowerCase().includes(resQuery);

      const matchesFactor = factorFilter === 'all' || log.factor_id.toString() === factorFilter;

      return matchesSearch && matchesResident && matchesFactor;
    });
  }, [sortedLogs, searchQuery, residentQuery, factorFilter, buildings]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [searchQuery, residentQuery, factorFilter, itemsPerPage]);

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, filteredLogs.length);

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(from, to);
  }, [filteredLogs, from, to]);

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
            
            <View style={styles.searchRow}>
              <Searchbar
                placeholder="Search House, Updater..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchbar, { flex: 1, marginRight: 8 }]}
              />
              <Searchbar
                placeholder="Filter by Resident..."
                onChangeText={setResidentQuery}
                value={residentQuery}
                style={[styles.searchbar, { flex: 1 }]}
                icon="account-search"
              />
            </View>

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
                  <DataTable>
                    <DataTable.Header style={styles.tableHeader}>
                      <DataTable.Title style={[styles.columnHeader, { width: 80 }]} textStyle={styles.headerText}>House No</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 130 }]} textStyle={styles.headerText}>Resident Name</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 110 }]} textStyle={styles.headerText}>Updater</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 80 }]} numeric textStyle={styles.headerText}>Amount</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 80 }]} textStyle={styles.headerText}>Collection</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 60 }]} textStyle={styles.headerText}>Month</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 60 }]} textStyle={styles.headerText}>Year</DataTable.Title>
                      <DataTable.Title style={[styles.columnHeader, { width: 140 }]} textStyle={styles.headerText}>Timestamp</DataTable.Title>
                    </DataTable.Header>

                    {paginatedLogs.length > 0 ? (
                      <FlatList
                        data={paginatedLogs}
                        renderItem={({ item, index }) => {
                          const building = resolveBuilding(item.building_id);
                          const houseNo = building?.house_no || `HN-${item.building_id}`;
                          const ownerName = building?.owner_name || 'N/A';
                          const updater = item.created_by_name || item.created_by || 'System';
                          const factorLabel = 
                            item.factor_id === 1 ? config.factor_1_label :
                            item.factor_id === 2 ? config.factor_2_label :
                            config.factor_3_label;

                          return (
                            <DataTable.Row style={styles.tableRow}>
                              <DataTable.Cell style={[styles.cell, { width: 80 }]} textStyle={styles.cellText}>{houseNo}</DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 130 }]}><Text numberOfLines={1} style={styles.cellText}>{ownerName}</Text></DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 110 }]}><Text numberOfLines={1} style={styles.cellText}>{updater}</Text></DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 80 }]} numeric textStyle={[styles.cellText, styles.amountText]}>₹{item.amount}</DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 80 }]}><Text numberOfLines={1} style={styles.cellText}>{factorLabel}</Text></DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 60 }]} textStyle={styles.cellText}>{MONTHS_ABBR[item.month - 1]}</DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 60 }]} textStyle={styles.cellText}>{item.year}</DataTable.Cell>
                              <DataTable.Cell style={[styles.cell, { width: 140 }]} textStyle={styles.cellText}>{formatTimestamp(item.created_at)}</DataTable.Cell>
                            </DataTable.Row>
                          );
                        }}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={true}
                      />
                    ) : (
                      <View style={styles.emptyState}>
                        <Text variant="bodyLarge" style={styles.emptyText}>No payment logs found</Text>
                      </View>
                    )}
                  </DataTable>
                </View>
              </ScrollView>
            </View>
            
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredLogs.length / itemsPerPage)}
              onPageChange={(page) => setPage(page)}
              label={`${from + 1}-${to} of ${filteredLogs.length}`}
              numberOfItemsPerPageList={numberOfItemsPerPageList}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              showFastPaginationControls
              selectPageDropdownLabel={'Rows per page'}
            />
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
    maxHeight: '92%',
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
  searchRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  searchbar: {
    backgroundColor: '#f1f3f5',
    elevation: 0,
    borderRadius: 8,
    height: 48,
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
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 48,
  },
  columnHeader: {
    paddingHorizontal: 4,
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: 48,
  },
  cell: {
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
  },
  cellText: {
    color: '#343a40',
    fontSize: 11,
  },
  amountText: {
    fontWeight: '600',
    color: '#2b8a3e',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: 740, // Match the total table columns width
  },
  emptyText: {
    color: '#868e96',
  },
  actions: {
    padding: 12,
    justifyContent: 'flex-end',
  },
});

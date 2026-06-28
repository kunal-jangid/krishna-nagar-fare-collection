import { useState, useEffect, useMemo, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  PaperProvider,
  MD3LightTheme,
  SegmentedButtons,
  Card,
  Text,
  Menu,
  Button,
  Portal,
  Modal,
  TextInput,
  IconButton,
  Divider
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Scene } from './src/components/3d/Scene';
import { Grid2D } from './src/components/2d/Grid2D';
import { BuildingOverlay } from './src/components/ui/BuildingOverlay';
import { BuildingData } from './src/types';
import { useBuildingData } from './src/hooks/useBuildingData';
import { useUserRole } from './src/hooks/useUserRole';
import { uploadBuildingImage, syncImagesLocally } from './src/services/imageService';
import { exportFactorToCSV } from './src/utils/csvExport';
import { supabase } from './src/lib/supabase';
import { Auth } from './src/components/Auth';
import { Session } from '@supabase/supabase-js';

import { setLoggerUser, logger } from './src/utils/logger';
import { backupData, resetToFreshStart } from './src/utils/dbMaintenance';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const name = session.user.user_metadata?.full_name || session.user.email || 'Unknown';
        setLoggerUser(name);
        logger.info('App session resumed', { user: name });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const name = session.user.user_metadata?.full_name || session.user.email || 'Unknown';
        setLoggerUser(name);
        logger.info(`Auth state change: ${_event}`, { user: name });
      } else {
        setLoggerUser(null);
        logger.info('User logged out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <PaperProvider theme={MD3LightTheme}>
        <Auth />
        <StatusBar style="auto" />
      </PaperProvider>
    );
  }

  const userName = session.user.user_metadata?.full_name || session.user.email || 'Unknown User';

  return <MainApp userName={userName} />;
}

function MainApp({ userName }: { userName: string }) {
  const { 
    buildings, 
    buildingMap,
    config, 
    logPayment, 
    getBuildingStatus, 
    getTotalCollection,
    updateConfig,
    updateBuilding,
    updatePaymentLog,
    deletePaymentLog,
    importLaneMap,
    refresh,
    forceSync,
    paymentLogs
  } = useBuildingData();

  const { role: userRole } = useUserRole();
  const isAdmin = userRole === 'admin';
  const isEditor = userRole === 'editor' || userRole === 'admin';

  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [activeFactorId, setActiveFactorId] = useState<number>(1);
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedBuildingCoord, setSelectedBuildingCoord] = useState<{ row: number, col: number } | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // UI States
  const [menuVisible, setMenuVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [maintenanceVisible, setMaintenanceVisible] = useState(false);
  const [factorMenuVisible, setFactorMenuVisible] = useState(false);
  const [visibleFactorIds, setVisibleFactorIds] = useState<number[]>([1]);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');

  const toggleFactorVisibility = (id: number) => {
    setVisibleFactorIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        const next = prev.filter(v => v !== id);
        if (activeFactorId === id) setActiveFactorId(next[0]);
        return next;
      } else {
        return [...prev, id].sort();
      }
    });
  };

  const showAllFactors = () => {
    setVisibleFactorIds([1, 2, 3]);
    setFactorMenuVisible(false);
  };

  const handleBackup = async () => {
    try {
      await backupData();
      setMaintenanceVisible(false);
    } catch (err: any) {
      Alert.alert('Backup Error', err.message);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Database',
      'This will clear ALL payment logs and building details (names, images). Structure (rows/cols) will be preserved. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToFreshStart();
              await refresh();
              setMaintenanceVisible(false);
              Alert.alert('Success', 'Database has been reset.');
            } catch (err: any) {
              Alert.alert('Reset Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleImportLaneMap = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) {
        throw new Error('Invalid format: Expected a 2D array [[...], [...]]');
      }
      await importLaneMap(parsed);
      setImportModalVisible(false);
      setMaintenanceVisible(false);
      setImportJson('');
      Alert.alert('Success', 'Lane map imported successfully.');
    } catch (err: any) {
      Alert.alert('Import Error', err.message);
    }
  };

  // Sync images locally when buildings are fetched
  useEffect(() => {
    if (buildings.length > 0) {
      syncImagesLocally(buildings);
    }
  }, [buildings]);

  // Derive target based on active factor
  const activeTarget = activeFactorId === 1 ? config.factor_1_target :
    activeFactorId === 2 ? config.factor_2_target : config.factor_3_target;

  const currentTotal = getTotalCollection(activeFactorId, activeMonth);

  const dbBuilding = selectedBuildingCoord ? buildingMap.get(`${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`) : null;

  const selectedBuilding = selectedBuildingCoord ? {
    building_id: dbBuilding?.building_id || `${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
    house_no: dbBuilding?.house_no && dbBuilding.house_no !== '' 
      ? dbBuilding.house_no 
      : `HN-${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
    owner_name: dbBuilding?.owner_name && dbBuilding.owner_name !== '' 
      ? dbBuilding.owner_name 
      : `Resident ${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
    row: selectedBuildingCoord.row,
    col: selectedBuildingCoord.col,
    floors: dbBuilding?.floors || 2,
    image_url: dbBuilding?.image_url,
    phone_number: dbBuilding?.phone_number,
    track_factor_1: dbBuilding?.track_factor_1 ?? true,
    track_factor_2: dbBuilding?.track_factor_2 ?? true,
    track_factor_3: dbBuilding?.track_factor_3 ?? true,
  } as BuildingData : null;

  const handleBuildingPress = (row: number, col: number) => {
    setSelectedBuildingCoord({ row, col });
    setOverlayVisible(true);
  };

  const handleUpdateImage = async () => {
    if (selectedBuilding) {
      const newUrl = await uploadBuildingImage(selectedBuilding);
      if (newUrl) refresh();
    }
  };

  const handleLogPayment = async (factorId: 1 | 2 | 3, month: number, amount: number) => {
    if (selectedBuilding) {
      await logPayment(selectedBuilding, factorId, month, amount, userName);
    }
  };

  const openTargetModal = () => {
    setNewTarget(activeTarget?.toString() || '0');
    setTargetModalVisible(true);
  };

  const saveTarget = async () => {
    const targetValue = parseFloat(newTarget);
    if (!isNaN(targetValue)) {
      const updateObj = activeFactorId === 1 ? { factor_1_target: targetValue } :
        activeFactorId === 2 ? { factor_2_target: targetValue } :
          { factor_3_target: targetValue };
      await updateConfig(updateObj);
      setTargetModalVisible(false);
    }
  };

  const handleUpdateMetadata = async (buildingId: string, updates: Partial<BuildingData>) => {
    await updateBuilding(buildingId, updates, selectedBuilding || undefined);
  };

  const factorButtons = [
    { value: '1', label: config.factor_1_label, labelStyle: styles.tabLabel },
    { value: '2', label: config.factor_2_label, labelStyle: styles.tabLabel },
    { value: '3', label: config.factor_3_label, labelStyle: styles.tabLabel },
  ];

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={MD3LightTheme}
        settings={{
          icon: props => <MaterialCommunityIcons {...props} />,
        }}
      >
        <SafeAreaView style={styles.container}>
          {/* Factor Navigation Bar */}
          <View style={styles.factorContainer}>
            <Menu
              visible={factorMenuVisible}
              onDismiss={() => setFactorMenuVisible(false)}
              anchor={
                <View style={styles.customTabBar}>
                  {factorButtons.filter(b => visibleFactorIds.includes(parseInt(b.value))).map((btn, index, arr) => {
                    const isActive = activeFactorId.toString() === btn.value;
                    const isFirst = index === 0;
                    const isLast = index === arr.length - 1;
                    
                    return (
                      <TouchableOpacity
                        key={btn.value}
                        onPress={() => setActiveFactorId(parseInt(btn.value))}
                        onLongPress={() => setFactorMenuVisible(true)}
                        delayLongPress={600}
                        style={[
                          styles.customTabButton,
                          isActive && styles.customTabActive,
                          isFirst && styles.customTabFirst,
                          isLast && styles.customTabLast,
                          arr.length === 1 && styles.customTabSingle
                        ]}
                      >
                        <Text style={[
                          styles.customTabText,
                          isActive && styles.customTabTextActive
                        ]}>
                          {btn.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              }
            >
              <Menu.Item 
                onPress={showAllFactors} 
                title="Show All" 
                leadingIcon="view-column"
              />
              <Divider />
              <Menu.Item 
                onPress={() => toggleFactorVisibility(1)} 
                title={config.factor_1_label} 
                leadingIcon={visibleFactorIds.includes(1) ? "checkbox-marked" : "checkbox-blank-outline"}
              />
              <Menu.Item 
                onPress={() => toggleFactorVisibility(2)} 
                title={config.factor_2_label} 
                leadingIcon={visibleFactorIds.includes(2) ? "checkbox-marked" : "checkbox-blank-outline"}
              />
              <Menu.Item 
                onPress={() => toggleFactorVisibility(3)} 
                title={config.factor_3_label} 
                leadingIcon={visibleFactorIds.includes(3) ? "checkbox-marked" : "checkbox-blank-outline"}
              />
            </Menu>
          </View>

          {/* Month Selection & View Toggle Bar */}
          <View style={styles.monthContainer}>
            <View style={styles.monthDropdownWrapper}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)}
                    icon="calendar-month"
                    style={styles.monthBtn}
                  >
                    {MONTHS[activeMonth - 1]} {CURRENT_YEAR}
                  </Button>
                }
              >
                {MONTHS.map((m, i) => (
                  <Menu.Item 
                    key={i} 
                    onPress={() => { setActiveMonth(i + 1); setMenuVisible(false); }} 
                    title={m} 
                  />
                ))}
              </Menu>
            </View>

            {/* View Mode Toggle */}

            <View style={styles.viewToggle}>
              <IconButton
                icon="sync"
                size={24}
                onPress={() => forceSync()}
              />
              <IconButton
                icon="file-excel-outline"
                size={24}
                onPress={() => exportFactorToCSV(
                  activeFactorId,
                  activeFactorId === 1 ? config.factor_1_label : activeFactorId === 2 ? config.factor_2_label : config.factor_3_label,
                  buildings,
                  paymentLogs
                )}
              />
              <IconButton
                icon={viewMode === '3D' ? 'view-grid' : 'cube-outline'}
                mode="contained-tonal"
                size={24}
                onPress={() => setViewMode(prev => prev === '3D' ? '2D' : '3D')}
              />
              <IconButton
                icon="logout"
                size={24}
                onPress={() => supabase.auth.signOut()}
              />
            </View>
          </View>

          {/* Visualization Scene */}
          {viewMode === '3D' ? (
            <Scene
              onBuildingPress={handleBuildingPress}
              buildings={buildings}
              buildingMap={buildingMap}
              getBuildingStatus={(id, fid) => getBuildingStatus(id, fid, activeMonth)}
              activeFactorId={activeFactorId}
            />
          ) : (
            <Grid2D
              onBuildingPress={handleBuildingPress}
              buildings={buildings}
              buildingMap={buildingMap}
              getBuildingStatus={(id, fid) => getBuildingStatus(id, fid, activeMonth)}
              activeFactorId={activeFactorId}
            />
          )}

          {/* Floating Collection Widget */}
          <View style={styles.widgetWrapper}>
            <Card style={styles.widget}>
              <Card.Content style={styles.widgetContent}>
                <TouchableOpacity 
                  style={styles.stat}
                  onLongPress={isAdmin ? () => setMaintenanceVisible(true) : undefined}
                  delayLongPress={2000}
                >
                  <Text variant="labelSmall" numberOfLines={1}>Collection</Text>
                  <Text variant="titleMedium">₹{currentTotal}</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.stat}
                  onPress={isEditor ? openTargetModal : undefined}
                  activeOpacity={isEditor ? 0.7 : 1}
                >
                  <Text variant="labelSmall" numberOfLines={1} style={styles.targetLabel}>
                    Target {isEditor && <MaterialCommunityIcons name="pencil-outline" size={10} />}
                  </Text>
                  <Text variant="titleMedium">₹{activeTarget}</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          </View>

          {/* Maintenance Modal */}
          <Portal>
            <Modal
              visible={maintenanceVisible}
              onDismiss={() => setMaintenanceVisible(false)}
              contentContainerStyle={styles.maintenanceModal}
            >
              <Text variant="headlineSmall" style={{ marginBottom: 16 }}>Maintenance</Text>
              <Button 
                mode="outlined" 
                onPress={handleBackup} 
                style={{ marginBottom: 12 }}
                icon="backup-restore"
              >
                Full JSON Backup
              </Button>
              <Button
                mode="outlined"
                onPress={() => setImportModalVisible(true)}
                style={{ marginBottom: 12 }}
                icon="file-import"
              >
                Import Lane Map (JSON)
              </Button>
              <Button 
                mode="contained" 
                onPress={handleReset} 
                buttonColor="#B00020"
                icon="delete-forever"
              >
                Destructive Reset
              </Button>
            </Modal>
          </Portal>

          {/* Target Edit Modal */}
          <Portal>
            <Modal
              visible={targetModalVisible}
              onDismiss={() => setTargetModalVisible(false)}
              contentContainerStyle={styles.modal}
            >
              <Text variant="headlineSmall">Update Target</Text>
              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Set monthly target for {activeFactorId === 1 ? config.factor_1_label : activeFactorId === 2 ? config.factor_2_label : config.factor_3_label}
              </Text>
              <TextInput
                label="Target Amount"
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="numeric"
                mode="outlined"
              />
              <View style={styles.modalActions}>
                <Button onPress={() => setTargetModalVisible(false)}>Cancel</Button>
                <Button mode="contained" onPress={saveTarget}>Save</Button>
              </View>
            </Modal>
          </Portal>

          {/* Lane Map Import Modal */}
          <Portal>
            <Modal
              visible={importModalVisible}
              onDismiss={() => setImportModalVisible(false)}
              contentContainerStyle={styles.modal}
            >
              <Text variant="headlineSmall">Import Lane Map</Text>
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                Paste the 2D array from laneMap.ts here. Existing buildings will be updated based on row/col.
              </Text>
              <TextInput
                label="JSON Array"
                value={importJson}
                onChangeText={setImportJson}
                mode="outlined"
                multiline
                numberOfLines={10}
                style={{ maxHeight: 300 }}
              />
              <View style={styles.modalActions}>
                <Button onPress={() => setImportModalVisible(false)}>Cancel</Button>
                <Button mode="contained" onPress={handleImportLaneMap}>Import</Button>
              </View>
            </Modal>
          </Portal>

          <BuildingOverlay
            visible={overlayVisible}
            onDismiss={() => setOverlayVisible(false)}
            building={selectedBuilding}
            logs={paymentLogs.filter(l => l.building_id === selectedBuilding?.building_id)}
            config={config}
            activeMonth={activeMonth}
            onUpdateImage={handleUpdateImage}
            onLogPayment={handleLogPayment}
            onUpdatePayment={updatePaymentLog}
            onDeletePayment={deletePaymentLog}
            onUpdateMetadata={handleUpdateMetadata}
          />

          <StatusBar style="auto" />
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  factorContainer: {
    padding: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    zIndex: 11,
  },
  monthContainer: {
    padding: 12,
    paddingTop: 4,
    backgroundColor: '#fff',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabLabel: {
    fontSize: 11,
  },
  customTabBar: {
    flexDirection: 'row',
    width: '100%',
  },
  customTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#79747E',
    borderRightWidth: 0,
  },
  customTabFirst: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  customTabLast: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderRightWidth: 1,
  },
  customTabSingle: {
    borderRadius: 20,
    borderRightWidth: 1,
  },
  customTabActive: {
    backgroundColor: '#E8DEF8',
  },
  customTabText: {
    fontSize: 12,
    color: '#49454F',
    fontWeight: '500',
  },
  customTabTextActive: {
    color: '#1D192B',
    fontWeight: '700',
  },
  monthDropdownWrapper: {
    flex: 1,
    marginRight: 8,
  },
  monthBtn: {
    borderRadius: 8,
    width: '100%',
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  widget: {
    borderRadius: 16,
    elevation: 8,
    backgroundColor: '#fff',
  },
  widgetContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  targetLabel: {
    color: MD3LightTheme.colors.primary,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  maintenanceModal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B00020',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 8,
  },
});

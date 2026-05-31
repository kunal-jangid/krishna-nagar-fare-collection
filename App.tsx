import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
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
  IconButton
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Scene } from './src/components/3d/Scene';
import { Grid2D } from './src/components/2d/Grid2D';
import { BuildingOverlay } from './src/components/ui/BuildingOverlay';
import { BuildingData } from './src/types';
import { useBuildingData } from './src/hooks/useBuildingData';
import { uploadBuildingImage } from './src/services/imageService';
import { exportFactorToCSV } from './src/utils/csvExport';
import { supabase } from './src/lib/supabase';
import { Auth } from './src/components/Auth';
import { Session } from '@supabase/supabase-js';

import { setLoggerUser, logger } from './src/utils/logger';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
    refresh,
    forceSync,
    paymentLogs
  } = useBuildingData();
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [activeFactorId, setActiveFactorId] = useState<number>(1);
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedBuildingCoord, setSelectedBuildingCoord] = useState<{ row: number, col: number } | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // UI States
  const [menuVisible, setMenuVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [newTarget, setNewTarget] = useState('');

  // Derive target based on active factor
  const activeTarget = activeFactorId === 1 ? config.factor_1_target :
    activeFactorId === 2 ? config.factor_2_target : config.factor_3_target;

  const currentTotal = getTotalCollection(activeFactorId, activeMonth);

  const selectedBuilding = selectedBuildingCoord ? (
    buildingMap.get(`${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`) || {
      building_id: `${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
      house_no: `HN-${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
      owner_name: `Resident ${selectedBuildingCoord.row}-${selectedBuildingCoord.col}`,
      row: selectedBuildingCoord.row,
      col: selectedBuildingCoord.col,
      floors: 2,
    } as BuildingData
  ) : null;

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
    await updateBuilding(buildingId, updates);
  };

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
            <SegmentedButtons
              value={activeFactorId.toString()}
              onValueChange={(val) => setActiveFactorId(parseInt(val))}
              buttons={[
                { value: '1', label: 'Security', labelStyle: styles.tabLabel },
                { value: '2', label: 'Thing 1', labelStyle: styles.tabLabel },
                { value: '3', label: 'Thing 2', labelStyle: styles.tabLabel },
              ]}
            />
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
                    {MONTHS[activeMonth - 1]} 2026
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
                <View style={styles.stat}>
                  <Text variant="labelSmall" numberOfLines={1}>Collection</Text>
                  <Text variant="titleMedium">₹{currentTotal}</Text>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.stat}
                  onPress={openTargetModal}
                  activeOpacity={0.7}
                >
                  <Text variant="labelSmall" numberOfLines={1} style={styles.targetLabel}>
                    Target <MaterialCommunityIcons name="pencil-outline" size={10} />
                  </Text>
                  <Text variant="titleMedium">₹{activeTarget}</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          </View>

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

          <BuildingOverlay
            visible={overlayVisible}
            onDismiss={() => setOverlayVisible(false)}
            building={selectedBuilding}
            logs={paymentLogs.filter(l => l.building_id === selectedBuilding?.building_id)}
            config={config}
            activeMonth={activeMonth}
            onUpdateImage={handleUpdateImage}
            onLogPayment={handleLogPayment}
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 8,
  },
});

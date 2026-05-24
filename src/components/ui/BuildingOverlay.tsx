import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Card, Divider, SegmentedButtons, TextInput, IconButton, Switch } from 'react-native-paper';
import { Image } from 'expo-image';
import { BuildingData, PaymentLog, AppConfig } from '../../types';
import { PaymentMatrix } from './PaymentMatrix';

interface BuildingOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  building: BuildingData | null;
  logs: PaymentLog[];
  config: AppConfig;
  activeMonth: number;
  onUpdateImage: () => void;
  onLogPayment: (factorId: 1 | 2 | 3, month: number, amount: number) => void;
  onUpdateMetadata: (buildingId: string, updates: Partial<BuildingData>) => Promise<void>;
}

export const BuildingOverlay = ({ 
  visible, 
  onDismiss, 
  building, 
  logs,
  config,
  activeMonth,
  onUpdateImage, 
  onLogPayment,
  onUpdateMetadata
}: BuildingOverlayProps) => {
  const [activeTab, setActiveFactor] = useState<string>('1');
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit states
  const [editHouseNo, setEditHouseNo] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editTrackF1, setEditTrackF1] = useState(true);
  const [editTrackF2, setEditTrackF2] = useState(true);
  const [editTrackF3, setEditTrackF3] = useState(true);

  // Sync edit states when building changes
  useEffect(() => {
    if (building) {
      setEditHouseNo(building.house_no);
      setEditOwnerName(building.owner_name);
      setEditTrackF1(building.track_factor_1 ?? true);
      setEditTrackF2(building.track_factor_2 ?? true);
      setEditTrackF3(building.track_factor_3 ?? true);
      
      // Auto-switch to first available tab if current is disabled
      if (activeTab === '1' && building.track_factor_1 === false) {
        if (building.track_factor_2 !== false) setActiveFactor('2');
        else if (building.track_factor_3 !== false) setActiveFactor('3');
      } else if (activeTab === '2' && building.track_factor_2 === false) {
        if (building.track_factor_1 !== false) setActiveFactor('1');
        else if (building.track_factor_3 !== false) setActiveFactor('3');
      } else if (activeTab === '3' && building.track_factor_3 === false) {
        if (building.track_factor_1 !== false) setActiveFactor('1');
        else if (building.track_factor_2 !== false) setActiveFactor('2');
      }
    }
  }, [building, visible]);

  if (!building) return null;

  const handleSaveMetadata = async () => {
    await onUpdateMetadata(building.building_id, {
      house_no: editHouseNo,
      owner_name: editOwnerName,
      track_factor_1: editTrackF1,
      track_factor_2: editTrackF2,
      track_factor_3: editTrackF3,
    });
    setIsEditing(false);
  };

  const isAssigned = 
    activeTab === '1' ? (building.track_factor_1 ?? true) :
    activeTab === '2' ? (building.track_factor_2 ?? true) :
    (building.track_factor_3 ?? true);

  const availableTabs = [
    (building.track_factor_1 ?? true) ? { value: '1', label: config.factor_1_label } : null,
    (building.track_factor_2 ?? true) ? { value: '2', label: config.factor_2_label } : null,
    (building.track_factor_3 ?? true) ? { value: '3', label: config.factor_3_label } : null,
  ].filter(Boolean) as { value: string, label: string }[];

  const hasAnyFactors = availableTabs.length > 0;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={() => { onDismiss(); setIsEditing(false); }} 
        contentContainerStyle={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            {building.image_url ? (
              <Image 
                source={{ uri: building.image_url }} 
                style={styles.image}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text variant="bodyMedium">No building photo</Text>
              </View>
            )}
            
            <Card.Content style={styles.content}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  {isEditing ? (
                    <>
                      <TextInput
                        label="House Number"
                        value={editHouseNo}
                        onChangeText={setEditHouseNo}
                        mode="outlined"
                        dense
                        style={styles.editInput}
                      />
                      <TextInput
                        label="Resident Name"
                        value={editOwnerName}
                        onChangeText={setEditOwnerName}
                        mode="outlined"
                        dense
                        style={styles.editInput}
                      />
                      <Text variant="labelLarge" style={styles.switchLabel}>Track Factors:</Text>
                      <View style={styles.switchRow}>
                        <Text variant="bodyMedium">{config.factor_1_label}</Text>
                        <Switch value={editTrackF1} onValueChange={setEditTrackF1} />
                      </View>
                      <View style={styles.switchRow}>
                        <Text variant="bodyMedium">{config.factor_2_label}</Text>
                        <Switch value={editTrackF2} onValueChange={setEditTrackF2} />
                      </View>
                      <View style={styles.switchRow}>
                        <Text variant="bodyMedium">{config.factor_3_label}</Text>
                        <Switch value={editTrackF3} onValueChange={setEditTrackF3} />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text variant="headlineSmall" style={styles.title}>House {building.house_no}</Text>
                      <Text variant="titleMedium" style={styles.subtitle}>{building.owner_name}</Text>
                    </>
                  )}
                </View>
                <IconButton 
                  icon={isEditing ? "check" : "pencil"} 
                  mode="contained-tonal"
                  onPress={isEditing ? handleSaveMetadata : () => setIsEditing(true)}
                />
                {isEditing && (
                  <IconButton 
                    icon="close" 
                    onPress={() => { setIsEditing(false); setEditHouseNo(building.house_no); setEditOwnerName(building.owner_name); }}
                  />
                )}
              </View>
              
              <Divider style={styles.divider} />

              {hasAnyFactors ? (
                <>
                  <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveFactor}
                    buttons={availableTabs}
                    style={styles.tabs}
                  />

                  <PaymentMatrix 
                    logs={logs} 
                    factorId={parseInt(activeTab) as 1 | 2 | 3}
                    factorLabel={
                      activeTab === '1' ? config.factor_1_label : 
                      activeTab === '2' ? config.factor_2_label : config.factor_3_label
                    }
                    activeMonth={activeMonth}
                    onLogPayment={onLogPayment} 
                    isAssigned={isAssigned}
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text variant="bodyLarge">Not tracking any factors for this house.</Text>
                  <Text variant="bodyMedium" style={styles.subtitle}>Tap the pencil icon to assign tracking.</Text>
                </View>
              )}

              <Divider style={styles.divider} />
              <View style={styles.footer}>
                <Text variant="bodySmall">Position: Row {building.row}, Col {building.col}</Text>
                <Text variant="bodySmall">Floors: {building.floors}</Text>
              </View>
            </Card.Content>
            <Card.Actions style={styles.actions}>
              <Button onPress={onUpdateImage} icon="camera" mode="outlined">Photo</Button>
              <Button onPress={() => { onDismiss(); setIsEditing(false); }} mode="contained">Close</Button>
            </Card.Actions>
          </Card>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    maxHeight: '95%',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#eee',
  },
  content: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  editInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  switchLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  tabs: {
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.6,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  actions: {
    padding: 12,
    justifyContent: 'flex-end',
    gap: 8,
  },
});

import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Modal, Portal, Text, Button, Card, Divider } from 'react-native-paper';
import { BuildingData } from '../../types';

interface BuildingOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  building: BuildingData | null;
  onUpdateImage: () => void;
  onLogPayment: () => void;
}

export const BuildingOverlay = ({ 
  visible, 
  onDismiss, 
  building, 
  onUpdateImage, 
  onLogPayment 
}: BuildingOverlayProps) => {
  if (!building) return null;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.container}
      >
        <Card>
          {building.image_url ? (
            <Card.Cover source={{ uri: building.image_url }} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text variant="bodyMedium">No image available</Text>
            </View>
          )}
          <Card.Content style={styles.content}>
            <Text variant="headlineSmall">House No: {building.house_no}</Text>
            <Text variant="titleMedium">Owner: {building.owner_name}</Text>
            <Divider style={styles.divider} />
            <Text variant="bodyLarge">Grid Position: {building.row}, {building.col}</Text>
            <Text variant="bodyLarge">Floors: {building.floors}</Text>
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button onPress={onUpdateImage} icon="camera">Update Image</Button>
            <Button onPress={onLogPayment} mode="contained">Log Payment</Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  content: {
    marginTop: 10,
  },
  divider: {
    marginVertical: 10,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});

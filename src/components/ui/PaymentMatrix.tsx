import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { DataTable, IconButton, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { PaymentLog, AppConfig } from '../../types';

interface PaymentMatrixProps {
  logs: PaymentLog[];
  config: AppConfig;
  onLogPayment: (factorId: 1 | 2 | 3, month: number, amount: number) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentMatrix = ({ logs, config, onLogPayment }: PaymentMatrixProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<1 | 2 | 3>(1);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [amount, setAmount] = useState('');

  const isPaid = (factorId: number, month: number) => {
    return logs.some(log => log.factor_id === factorId && log.month === month);
  };

  const handleOpenLog = (factorId: 1 | 2 | 3, month: number) => {
    setSelectedFactor(factorId);
    setSelectedMonth(month);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    onLogPayment(selectedFactor, selectedMonth, parseFloat(amount));
    setModalVisible(false);
    setAmount('');
  };

  const renderFactorRow = (factorId: 1 | 2 | 3, label: string) => (
    <DataTable.Row key={factorId}>
      <DataTable.Cell sticky>{label}</DataTable.Cell>
      {MONTHS.map((_, index) => (
        <DataTable.Cell key={index} numeric>
          <IconButton
            icon={isPaid(factorId, index + 1) ? 'check-circle' : 'circle-outline'}
            iconColor={isPaid(factorId, index + 1) ? '#4caf50' : '#bdbdbd'}
            size={20}
            onPress={() => handleOpenLog(factorId, index + 1)}
          />
        </DataTable.Cell>
      ))}
    </DataTable.Row>
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title sticky>Factor</DataTable.Title>
            {MONTHS.map(month => (
              <DataTable.Title key={month} numeric>{month}</DataTable.Title>
            ))}
          </DataTable.Header>

          {renderFactorRow(1, config.factor_1_label)}
          {renderFactorRow(2, config.factor_2_label)}
          {renderFactorRow(3, config.factor_3_label)}
        </DataTable>
      </ScrollView>

      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)} 
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall">Log Payment</Text>
          <Text variant="bodyMedium">
            Factor: {selectedFactor === 1 ? config.factor_1_label : selectedFactor === 2 ? config.factor_2_label : config.factor_3_label}
          </Text>
          <Text variant="bodyMedium">Month: {MONTHS[selectedMonth - 1]}</Text>
          
          <TextInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          
          <Button mode="contained" onPress={handleSubmit} style={styles.button}>
            Submit Payment
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  table: {
    minWidth: 800,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginVertical: 15,
  },
  button: {
    marginTop: 10,
  },
});

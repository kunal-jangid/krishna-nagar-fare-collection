import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { IconButton, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { PaymentLog } from '../../types';

interface PaymentMatrixProps {
  logs: PaymentLog[];
  factorId: 1 | 2 | 3;
  factorLabel: string;
  activeMonth: number;
  onLogPayment: (factorId: 1 | 2 | 3, month: number, amount: number) => void;
  isAssigned?: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentMatrix = ({ logs, factorId, factorLabel, activeMonth, onLogPayment, isAssigned = true }: PaymentMatrixProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(activeMonth);
  const [amount, setAmount] = useState('');

  // Sync selectedMonth with activeMonth when props change
  useEffect(() => {
    setSelectedMonth(activeMonth);
  }, [activeMonth]);

  const isPaid = (month: number) => {
    return logs.some(log => log.factor_id === factorId && log.month === month);
  };

  const handleOpenLog = (month: number) => {
    if (!isAssigned) return;
    setSelectedMonth(month);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount)) {
      onLogPayment(factorId, selectedMonth, parsedAmount);
      setModalVisible(false);
      setAmount('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Quick Action for Active Month */}
      <View style={styles.quickAction}>
        <Button 
          mode="contained-tonal" 
          icon={isPaid(activeMonth) ? 'check' : 'plus'} 
          onPress={() => handleOpenLog(activeMonth)}
          disabled={!isAssigned || isPaid(activeMonth)}
        >
          {!isAssigned ? 'Not Tracking' : (isPaid(activeMonth) ? 'Paid for ' : 'Log for ')} {MONTHS[activeMonth - 1]}
        </Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {/* Header Row */}
          <View style={styles.row}>
            <View style={[styles.cell, styles.factorHeaderCell]}>
              <Text variant="labelLarge" style={styles.headerText}>{factorLabel}</Text>
            </View>
            {MONTHS.map((month) => (
              <View key={month} style={[styles.cell, styles.monthCell]}>
                <Text variant="labelLarge" style={styles.headerText}>{month}</Text>
              </View>
            ))}
          </View>

          {/* Status Row */}
          <View style={styles.row}>
            <View style={[styles.cell, styles.factorCell]}>
              <Text variant="bodyMedium">Status</Text>
            </View>
            {MONTHS.map((_, index) => {
              const monthIndex = index + 1;
              const isActive = monthIndex === activeMonth;
              const paid = isPaid(monthIndex);
              
              const iconColor = !isAssigned ? '#e0e0e0' : (paid ? '#4caf50' : (isActive ? '#ff5252' : '#bdbdbd'));

              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.cell, 
                    styles.monthCell, 
                    isActive && isAssigned && styles.activeMonthCell
                  ]}
                  onPress={() => handleOpenLog(monthIndex)}
                  disabled={!isAssigned}
                  activeOpacity={0.7}
                >
                  <IconButton
                    icon={paid ? 'check-circle' : (!isAssigned ? 'circle-off-outline' : 'circle-outline')}
                    iconColor={iconColor}
                    size={22}
                    style={{ margin: 0 }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)} 
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall">Log Payment</Text>
          <Text variant="bodyLarge" style={styles.modalSubtitle}>
            {factorLabel} - {MONTHS[selectedMonth - 1]} 2026
          </Text>
          
          <TextInput
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            autoFocus
          />
          
          <View style={styles.modalActions}>
            <Button onPress={() => setModalVisible(false)} style={styles.flexBtn}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit} style={styles.flexBtn}>Confirm</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  quickAction: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  factorHeaderCell: {
    width: 100,
    backgroundColor: '#f5f5f5',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  factorCell: {
    width: 100,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  monthCell: {
    width: 60,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#333',
  },
  activeMonthCell: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalSubtitle: {
    marginBottom: 8,
    color: '#666',
  },
  input: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  flexBtn: {
    minWidth: 100,
  },
});

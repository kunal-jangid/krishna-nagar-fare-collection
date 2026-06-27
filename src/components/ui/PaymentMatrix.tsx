import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { IconButton, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { PaymentLog } from '../../types';
import { useUserRole } from '../../hooks/useUserRole';

interface PaymentMatrixProps {
  logs: PaymentLog[];
  factorId: 1 | 2 | 3;
  factorLabel: string;
  activeMonth: number;
  onLogPayment: (factorId: 1 | 2 | 3, month: number, amount: number) => void;
  onUpdatePayment?: (logId: string, newAmount: number) => void;
  onDeletePayment?: (logId: string) => void;
  isAssigned?: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentMatrix = ({
  logs,
  factorId,
  factorLabel,
  activeMonth,
  onLogPayment,
  onUpdatePayment,
  onDeletePayment,
  isAssigned = true
}: PaymentMatrixProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(activeMonth);
  const [amount, setAmount] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const { role: userRole, email: userEmail } = useUserRole();
  const isAdmin = userRole === 'admin';
  const isEditor = userRole === 'editor' || userRole === 'admin';
  const canDelete = isAdmin;
  const canLogOrUpdate = isEditor;

  // Sync selectedMonth with activeMonth when props change
  useEffect(() => {
    setSelectedMonth(activeMonth);
  }, [activeMonth]);

  const getLogForMonth = (month: number) => {
    return logs.find(log => log.factor_id === factorId && log.month === month);
  };

  const isPaid = (month: number) => !!getLogForMonth(month);

  const handleOpenLog = (month: number) => {
    if (!isAssigned) return;
    const existingLog = getLogForMonth(month);

    // If it's already paid, only editors or admins can open it to edit/delete
    if (existingLog) {
      if (!isEditor) return;
      setAmount(existingLog.amount.toString());
      setEditingLogId(existingLog.id);
    } else {
      // If not paid, only editors or admins can log a new payment
      if (!isEditor) return;
      setAmount('');
      setEditingLogId(null);
    }

    setSelectedMonth(month);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!isNaN(parsedAmount)) {
      if (editingLogId && onUpdatePayment) {
        onUpdatePayment(editingLogId, parsedAmount);
      } else {
        onLogPayment(factorId, selectedMonth, parsedAmount);
      }
      setModalVisible(false);
      setAmount('');
      setEditingLogId(null);
    }
  };

  const handleDelete = () => {
    if (editingLogId && onDeletePayment) {
      onDeletePayment(editingLogId);
      setModalVisible(false);
      setAmount('');
      setEditingLogId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Quick Action for Active Month */}
      <View style={styles.quickAction}>
        <Button 
          mode="contained-tonal" 
          icon={isPaid(activeMonth) ? (isEditor ? 'pencil' : 'check') : 'plus'}
          onPress={() => handleOpenLog(activeMonth)}
          disabled={!isAssigned || (isPaid(activeMonth) && !isEditor)}
        >
          {!isAssigned ? 'Not Tracking' : (isPaid(activeMonth) ? (isEditor ? 'Edit ' : 'Paid for ') : 'Log for ')} {MONTHS[activeMonth - 1]}
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
                  disabled={!isAssigned || (paid && !isEditor)}
                  activeOpacity={0.7}
                >
                  <IconButton
                    icon={paid ? (isEditor ? 'pencil-circle' : 'check-circle') : (!isAssigned ? 'circle-off-outline' : 'circle-outline')}
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
          <Text variant="headlineSmall">{editingLogId ? 'Update Payment' : 'Log Payment'}</Text>
          <Text variant="bodyLarge" style={styles.modalSubtitle}>
            {factorLabel} - {MONTHS[selectedMonth - 1]} {new Date().getFullYear()}
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
            {editingLogId && canDelete && (
              <Button
                onPress={handleDelete}
                textColor="#ff5252"
                style={styles.flexBtn}
              >
                Delete
              </Button>
            )}
            <Button onPress={() => setModalVisible(false)} style={styles.flexBtn}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit} style={styles.flexBtn}>
              {editingLogId ? 'Update' : 'Confirm'}
            </Button>
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

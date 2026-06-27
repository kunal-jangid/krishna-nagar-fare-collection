import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BuildingData, PaymentLog } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const exportFactorToCSV = async (
  factorId: number, 
  factorLabel: string, 
  buildings: BuildingData[], 
  paymentLogs: PaymentLog[]
) => {
  // 1. Generate CSV Header
  let csvContent = `House No,Resident Name,Phone,Row,Col,${MONTHS.join(',')},Total\n`;

  // 2. Filter logs for this factor
  const factorLogs = paymentLogs.filter(log => log.factor_id === factorId);

  // 3. Generate Rows
  buildings.forEach(building => {
    // Check if building is tracking this factor
    const isAssigned = 
      factorId === 1 ? (building.track_factor_1 ?? true) :
      factorId === 2 ? (building.track_factor_2 ?? true) :
      (building.track_factor_3 ?? true);

    let rowStr = `${building.house_no},${building.owner_name},${building.phone_number || ''},${building.row},${building.col},`;
    let rowTotal = 0;

    if (!isAssigned) {
      // Fill months with NA and Total with 0
      rowStr += Array(12).fill('NA').join(',') + `,0\n`;
    } else {
      // Calculate each month's contribution
      const monthContributions = MONTHS.map((_, index) => {
        const monthNum = index + 1;
        const log = factorLogs.find(l => l.building_id === building.building_id && l.month === monthNum);
        const amount = log ? log.amount : 0;
        rowTotal += amount;
        return amount;
      });
      
      rowStr += monthContributions.join(',') + `,${rowTotal}\n`;
    }
    
    csvContent += rowStr;
  });

  // 4. Save and Share File
  try {
    const fileName = `${factorLabel.replace(/\s+/g, '_')}_Report_${new Date().getFullYear()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${factorLabel} Report`,
        UTI: 'public.comma-separated-values-text'
      });
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
};

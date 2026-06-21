import { supabase } from '../lib/supabase';
import { getDB } from '../lib/localStorage';
import { logger } from '../utils/logger';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Maintenance utilities for database management.
 * These are intended to be run manually from code or a hidden debug menu.
 */

/**
 * Backs up all building data and payment logs to a JSON file and opens the share sheet.
 * Includes matrix positions (row, col) to allow re-mapping if the neighborhood layout changes.
 */
export const backupData = async () => {
  try {
    logger.info('Starting full data backup...');
    
    // Fetch all data from Supabase
    const { data: buildings, error: bError } = await supabase.from('buildings').select('*');
    if (bError) throw bError;

    const { data: paymentLogs, error: lError } = await supabase.from('payment_logs').select('*');
    if (lError) throw lError;

    const { data: config, error: cError } = await supabase.from('app_config').select('*');
    if (cError) throw cError;

    const backup = {
      timestamp: new Date().toISOString(),
      app_version: '1.0.0',
      data: {
        buildings,
        payment_logs: paymentLogs,
        app_config: config
      }
    };

    const fileName = `backup_${new Date().getTime()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2));
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Backup Krishna Nagar Data',
        UTI: 'public.json'
      });
    }

    logger.info('Backup completed successfully.');
    return backup;
  } catch (error: any) {
    logger.error('Backup failed', { error: error.message });
    throw error;
  }
};

/**
 * Clears transactional data (payment logs) and user-modified building fields (owner, house_no, image_url),
 * but preserves the structural constants (row, col, basic configuration).
 * 
 * WARNING: This is destructive.
 */
export const resetToFreshStart = async () => {
  try {
    logger.info('WARNING: Initiating destructive database reset...');

    // 1. Clear all payment logs
    const { error: lError } = await supabase.from('payment_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (lError) throw lError;

    // 2. Reset building metadata but keep structure (row, col)
    // Note: This resets owner_name and house_no to null/defaults. 
    // We assume building_id, row, and col are structural constants we want to keep.
    const { error: bError } = await supabase
      .from('buildings')
      .update({
        owner_name: '',
        house_no: '',
        phone_number: null,
        image_url: null,
        // Reset tracking flags to false (grey/not tracked)
        track_factor_1: false,
        track_factor_2: false,
        track_factor_3: false,
        floors: 1
      })
      .neq('building_id', '00000000-0000-0000-0000-000000000000');
    
    if (bError) throw bError;

    // 3. Clear local SQLite sync queue to avoid ghost updates
    const db = await getDB();
    await db.runAsync('DELETE FROM pending_sync');

    logger.info('Database reset completed successfully.');
  } catch (error: any) {
    logger.error('Reset failed', { error: error.message });
    throw error;
  }
};

/**
 * Imports a new lane map (grid structure) and updates the buildings table.
 * @param newLaneMap A 2D array representing the new grid structure (floors at each position).
 */
export const importLaneMap = async (newLaneMap: number[][]) => {
  try {
    logger.info('Starting lane map import...');

    // 1. Fetch existing buildings to preserve metadata
    const { data: existingBuildings, error: bError } = await supabase.from('buildings').select('*');
    if (bError) throw bError;

    const buildingMap = new Map<string, any>();
    existingBuildings?.forEach(b => buildingMap.set(`${b.row}-${b.col}`, b));

    // 2. Prepare new buildings data
    const newBuildings: any[] = [];
    newLaneMap.forEach((rowArr, rowIndex) => {
      rowArr.forEach((floors, colIndex) => {
        if (floors === 0) return;

        const key = `${rowIndex}-${colIndex}`;
        const existing = buildingMap.get(key);

        newBuildings.push({
          row: rowIndex,
          col: colIndex,
          floors: floors,
          house_no: existing?.house_no || '',
          owner_name: existing?.owner_name || '',
          phone_number: existing?.phone_number || null,
          image_url: existing?.image_url || null,
          track_factor_1: existing?.track_factor_1 ?? true,
          track_factor_2: existing?.track_factor_2 ?? true,
          track_factor_3: existing?.track_factor_3 ?? true,
        });
      });
    });

    // 3. Perform upsert on row/col to preserve building_id and link to logs
    logger.info(`Importing ${newBuildings.length} buildings...`);

    const { error: upsertError } = await supabase
      .from('buildings')
      .upsert(newBuildings, { onConflict: 'row,col' });

    if (upsertError) throw upsertError;

    logger.info('Lane map import completed successfully.');
  } catch (error: any) {
    logger.error('Lane map import failed', { error: error.message });
    throw error;
  }
};

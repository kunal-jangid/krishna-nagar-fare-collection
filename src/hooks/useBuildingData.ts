import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { BuildingData, PaymentLog, AppConfig } from '../types';
import { DEFAULT_APP_CONFIG, SYNC_INTERVAL_MS } from '../constants/config';
import { getLocalConfig, saveLocalConfig, queueSync, getDB } from '../lib/localStorage';
import { logger } from '../utils/logger';

export type StatusType = 'green' | 'red' | 'grey';

export const useBuildingData = () => {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load targets from local storage
  const loadLocalConfig = async () => {
    const localTargets = await getLocalConfig('targets', {
      factor_1_target: DEFAULT_APP_CONFIG.factor_1_target,
      factor_2_target: DEFAULT_APP_CONFIG.factor_2_target,
      factor_3_target: DEFAULT_APP_CONFIG.factor_3_target,
    });
    
    setConfig(prev => ({
      ...prev,
      ...localTargets
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    // Reduced noise: only log in console for dev, not to Supabase for every refresh
    console.log('[INFO] Refreshing building and payment data from Supabase...');
    
    try {
      // Fetch buildings from Supabase
      const { data: buildingsData, error: bError } = await supabase
        .from('buildings')
        .select('*');
      
      if (bError) logger.error('Fetch buildings failed', { error: bError.message });

      // Fetch logs from Supabase
      const { data: logsData, error: lError } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('year', new Date().getFullYear());
        
      if (lError) logger.error('Fetch payment logs failed', { error: lError.message });

      // Labels still come from Supabase if needed, or fallback to default
      const { data: configData } = await supabase
        .from('app_config')
        .select('factor_1_label, factor_2_label, factor_3_label')
        .single();

      if (buildingsData) setBuildings(buildingsData);
      if (logsData) setPaymentLogs(logsData);
      
      if (configData) {
        setConfig(prev => ({
          ...prev,
          ...configData
        }));
      }

      await loadLocalConfig();
    } catch (err: any) {
      logger.error('Unexpected error in fetchData', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isUUID = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

  const ensureBuildingRegistered = async (building: BuildingData): Promise<string | null> => {
    if (isUUID(building.building_id)) return building.building_id;

    logger.info(`Registering house ${building.house_no} in Supabase for the first time...`);
    const { data: newBuilding, error: bError } = await supabase
      .from('buildings')
      .insert({
        house_no: building.house_no,
        owner_name: building.owner_name,
        row: building.row,
        col: building.col,
        floors: building.floors,
        track_factor_1: building.track_factor_1 ?? true,
        track_factor_2: building.track_factor_2 ?? true,
        track_factor_3: building.track_factor_3 ?? true,
      })
      .select()
      .single();
    
    if (bError) {
      logger.error('Supabase building registration failed', { error: bError.message });
      return null;
    }
    return newBuilding.building_id;
  };

  const forceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const db = await getDB();
      const pending = await db.getAllAsync<{ id: number, table_name: string, action: string, data: string }>(
        'SELECT * FROM pending_sync ORDER BY created_at ASC'
      );

      if (pending.length > 0) {
        logger.info(`Syncing ${pending.length} pending transactions/updates to cloud...`);
        const syncedIds: number[] = [];

        for (const item of pending) {
          const data = JSON.parse(item.data);
          let error = null;

          if (item.table_name === 'payment_logs') {
            const { error: syncErr } = await supabase.from('payment_logs').insert(data);
            error = syncErr;
          } else if (item.table_name === 'buildings') {
            const { error: syncErr } = await supabase.from('buildings').insert(data);
            error = syncErr;
          }

          if (!error) {
            syncedIds.push(item.id);
          } else {
            logger.error(`Sync failed for item ${item.id} on table ${item.table_name}`, { error: error.message });
          }
        }

        if (syncedIds.length > 0) {
          await db.runAsync(`DELETE FROM pending_sync WHERE id IN (${syncedIds.join(',')})`);
        }
        logger.info('Background sync cycle complete.');
      }
      
      await fetchData(); 
    } catch (e: any) {
      logger.error('Force sync failed', { error: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Background Sync Effect
  useEffect(() => {
    const syncInterval = setInterval(() => {
      forceSync();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(syncInterval);
  }, [config]); // config might affect sync parameters, but isSyncing shouldn't reset it

  useEffect(() => {
    fetchData();
  }, []);

  const logPayment = async (building: BuildingData, factorId: number, month: number, amount: number, userName: string) => {
    const factorLabel = factorId === 1 ? config.factor_1_label : factorId === 2 ? config.factor_2_label : config.factor_3_label;
    logger.info(`Transaction added for house no. ${building.house_no}: Paid ₹${amount} for ${factorLabel} (Month ${month})`, { 
      house: building.house_no, 
      factorId, 
      month, 
      amount 
    });

    const buildingId = await ensureBuildingRegistered(building);
    if (!buildingId) return;

    const payload = {
      building_id: buildingId,
      factor_id: factorId,
      month,
      amount,
      year: new Date().getFullYear(),
      created_by_name: userName,
    };

    setPaymentLogs(prev => [...prev, { ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString(), created_by: '' } as PaymentLog]);

    await queueSync('payment_logs', 'INSERT', payload);
    logger.info(`Payment for house ${building.house_no} queued for cloud sync.`);
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    
    const targets = {
      factor_1_target: updatedConfig.factor_1_target,
      factor_2_target: updatedConfig.factor_2_target,
      factor_3_target: updatedConfig.factor_3_target,
    };
    await saveLocalConfig('targets', targets);
    logger.info('Collection targets updated locally.', targets);
  };

  const buildingMap = useMemo(() => {
    const map = new Map<string, BuildingData>();
    buildings.forEach(b => map.set(`${b.row}-${b.col}`, b));
    return map;
  }, [buildings]);

  const paidStatusIndex = useMemo(() => {
    const index = new Map<string, Set<string>>();
    paymentLogs.forEach(log => {
      const key = `${log.factor_id}-${log.month}`;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key)!.add(log.building_id);
    });
    return index;
  }, [paymentLogs]);

  const getBuildingStatus = useCallback((buildingId: string, activeFactorId: number, month: number): StatusType => {
    const building = buildings.find(b => b.building_id === buildingId);
    
    const isAssigned = building ? (
      activeFactorId === 1 ? building.track_factor_1 :
      activeFactorId === 2 ? building.track_factor_2 : building.track_factor_3
    ) : true;

    if (!isAssigned) return 'grey';

    const key = `${activeFactorId}-${month}`;
    return paidStatusIndex.get(key)?.has(buildingId) ? 'green' : 'red';
  }, [buildings, paidStatusIndex]);

  const getTotalCollection = useCallback((factorId: number, month: number) => {
    return paymentLogs
      .filter(log => log.factor_id === factorId && log.month === month)
      .reduce((sum, log) => sum + Number(log.amount), 0);
  }, [paymentLogs]);

  const updateBuilding = async (buildingId: string, updates: Partial<BuildingData>) => {
    const building = buildings.find(b => b.building_id === buildingId);
    const houseName = building?.house_no || buildingId;
    
    let changeLog = [];
    if (updates.house_no || updates.owner_name) changeLog.push('metadata updated');
    if (updates.track_factor_1 !== undefined || updates.track_factor_2 !== undefined || updates.track_factor_3 !== undefined) {
      changeLog.push('factors changed');
    }
    
    logger.info(`Configuration for house no. ${houseName} changed: ${changeLog.join(' & ')}`, updates);

    const isRealUUID = isUUID(buildingId);

    if (isRealUUID) {
      const { error } = await supabase
        .from('buildings')
        .update(updates)
        .eq('building_id', buildingId);

      if (!error) {
        await fetchData();
      } else {
        logger.error('Supabase metadata update failed', { error: error.message, buildingId });
      }
    } else {
      // If it's a temp ID, we can still use ensureBuildingRegistered if we have the full building object
      // or we can just parse the row/col from the building object found in our state
      if (building) {
        const registeredId = await ensureBuildingRegistered({ ...building, ...updates });
        if (registeredId) await fetchData();
      } else {
        logger.error('Failed to update building: Building object not found for temp ID', { buildingId });
      }
    }
  };

  return { 
    buildings, 
    buildingMap,
    paymentLogs, 
    config, 
    loading, 
    logPayment, 
    getBuildingStatus, 
    getTotalCollection,
    updateConfig,
    updateBuilding,
    forceSync,
    refresh: fetchData 
  };
};

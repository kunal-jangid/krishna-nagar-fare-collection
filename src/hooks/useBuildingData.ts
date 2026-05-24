import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { BuildingData, PaymentLog, AppConfig } from '../types';
import { DEFAULT_APP_CONFIG } from '../constants/config';
import { getLocalConfig, saveLocalConfig, queueSync, getDB } from '../lib/localStorage';

export type StatusType = 'green' | 'red' | 'grey';

export const useBuildingData = () => {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);

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
    
    // Fetch buildings from Supabase
    const { data: buildingsData } = await supabase
      .from('buildings')
      .select('*');
    
    // Fetch logs from Supabase
    const { data: logsData } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('year', new Date().getFullYear());

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
    setLoading(false);
  };

  // Background Sync Effect (every 2 minutes)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      const db = await getDB();
      const pending = await db.getAllAsync<{ id: number, table_name: string, action: string, data: string }>(
        'SELECT * FROM pending_sync ORDER BY created_at ASC'
      );

      if (pending.length === 0) return;

      console.log(`Background sync: processing ${pending.length} items...`);

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
          await db.runAsync('DELETE FROM pending_sync WHERE id = ?', [item.id]);
        } else {
          console.error(`Sync failed for item ${item.id}:`, error.message);
        }
      }
      
      await fetchData(); // Refresh data after successful sync
    }, 120000); // 120,000 ms = 2 minutes

    return () => clearInterval(syncInterval);
  }, [config]);

  useEffect(() => {
    fetchData();
  }, []);

  const logPayment = async (building: BuildingData, factorId: number, month: number, amount: number, userName: string) => {
    let buildingId = building.building_id;
    const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildingId);

    // If building is not in Supabase yet, we need to register it (or queue it)
    if (!isRealUUID) {
      const { data: newBuilding, error: bError } = await supabase
        .from('buildings')
        .insert({
          house_no: building.house_no,
          owner_name: building.owner_name,
          row: building.row,
          col: building.col,
          floors: building.floors,
          track_factor_1: building.track_factor_1,
          track_factor_2: building.track_factor_2,
          track_factor_3: building.track_factor_3,
        })
        .select()
        .single();
      
      if (bError) {
        console.warn('Supabase building creation failed, queuing locally...');
        return; 
      }
      buildingId = newBuilding.building_id;
    }

    const payload = {
      building_id: buildingId,
      factor_id: factorId,
      month,
      amount,
      year: new Date().getFullYear(),
      created_by_name: userName,
    };

    // Real-time optimistic local update
    setPaymentLogs(prev => [...prev, { ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString(), created_by: '' } as PaymentLog]);

    // Queue for background sync
    await queueSync('payment_logs', 'INSERT', payload);
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    // Local target updates only
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    
    // Save only targets to local storage
    const targets = {
      factor_1_target: updatedConfig.factor_1_target,
      factor_2_target: updatedConfig.factor_2_target,
      factor_3_target: updatedConfig.factor_3_target,
    };
    await saveLocalConfig('targets', targets);
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
    
    // Check if building is assigned to track this factor
    const isAssigned = building ? (
      activeFactorId === 1 ? building.track_factor_1 :
      activeFactorId === 2 ? building.track_factor_2 : building.track_factor_3
    ) : true; // Default to true for mock buildings

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
    const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildingId);

    if (isRealUUID) {
      const { error } = await supabase
        .from('buildings')
        .update(updates)
        .eq('building_id', buildingId);

      if (!error) {
        await fetchData();
      } else {
        console.error('Error updating building:', error.message);
      }
    } else {
      // For mock buildings, we create them first with the updates
      const coords = buildingId.split('-');
      const { error } = await supabase
        .from('buildings')
        .insert({
          row: parseInt(coords[0]),
          col: parseInt(coords[1]),
          ...updates
        });
      
      if (!error) {
        await fetchData();
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
    refresh: fetchData 
  };
};

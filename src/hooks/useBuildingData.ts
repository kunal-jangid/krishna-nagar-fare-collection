import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BuildingData, PaymentLog, AppConfig } from '../types';

export const useBuildingData = () => {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    factor_1_label: 'Security Guard',
    factor_2_label: 'Thing 1',
    factor_3_label: 'Thing 2',
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch buildings
    const { data: buildingsData } = await supabase
      .from('buildings')
      .select('*');
    
    // Fetch logs for current year
    const { data: logsData } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('year', new Date().getFullYear());

    // Fetch config
    const { data: configData } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (buildingsData) setBuildings(buildingsData);
    if (logsData) setPaymentLogs(logsData);
    if (configData) setConfig(configData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const logPayment = async (buildingId: string, factorId: number, month: number, amount: number) => {
    const { error } = await supabase.from('payment_logs').insert({
      building_id: buildingId,
      factor_id: factorId,
      month,
      amount,
      year: new Date().getFullYear(),
    });

    if (!error) {
      fetchData(); // Refresh
    }
  };

  const isBuildingRed = (buildingId: string) => {
    const lastMonth = new Date().getMonth(); // 0-indexed, so 0 is Jan
    if (lastMonth === 0) return false; // Skip for Jan (previous year logic not implemented)
    
    const logsForBuilding = paymentLogs.filter(log => log.building_id === buildingId && log.month === lastMonth);
    // Red if any of the 3 factors are missing for last month
    const uniqueFactorsPaid = new Set(logsForBuilding.map(l => l.factor_id)).size;
    return uniqueFactorsPaid < 3;
  };

  return { buildings, paymentLogs, config, loading, logPayment, isBuildingRed, refresh: fetchData };
};

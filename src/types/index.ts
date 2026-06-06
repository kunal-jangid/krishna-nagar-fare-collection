export interface BuildingData {
  building_id: string;
  house_no: string;
  owner_name: string;
  row: number;
  col: number;
  floors: number;
  image_url?: string;
  phone_number?: string;
  track_factor_1: boolean;
  track_factor_2: boolean;
  track_factor_3: boolean;
}

export interface PaymentLog {
  id: string;
  building_id: string;
  factor_id: 1 | 2 | 3;
  amount: number;
  month: number;
  year: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface AppLog {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: any;
  user_name?: string;
}

export interface AppConfig {
  id?: string;
  factor_1_label: string;
  factor_2_label: string;
  factor_3_label: string;
  factor_1_target?: number;
  factor_2_target?: number;
  factor_3_target?: number;
}

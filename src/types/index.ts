export interface BuildingData {
  building_id: string;
  house_no: string;
  owner_name: string;
  row: number;
  col: number;
  floors: number;
  image_url?: string;
}

export interface PaymentLog {
  id: string;
  building_id: string;
  factor_id: 1 | 2 | 3;
  amount: number;
  month: number;
  year: number;
  created_by: string;
  created_at: string;
}

export interface AppConfig {
  factor_1_label: string;
  factor_2_label: string;
  factor_3_label: string;
}

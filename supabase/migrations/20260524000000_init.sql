-- Create tables as per design spec
CREATE TABLE app_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factor_1_label text DEFAULT 'Security Guard',
  factor_2_label text DEFAULT 'Thing 1',
  factor_3_label text DEFAULT 'Thing 2'
);

CREATE TABLE buildings (
  building_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_no text,
  owner_name text,
  row int NOT NULL,
  col int NOT NULL,
  floors int DEFAULT 1,
  image_url text,
  track_factor_1 boolean DEFAULT true,
  track_factor_2 boolean DEFAULT true,
  track_factor_3 boolean DEFAULT true
);

CREATE TABLE payment_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id uuid REFERENCES buildings(building_id),
  factor_id int CHECK (factor_id IN (1, 2, 3)),
  amount decimal,
  month int CHECK (month BETWEEN 1 AND 12),
  year int,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz DEFAULT now()
);

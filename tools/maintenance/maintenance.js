const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables are missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const backupData = async () => {
  console.log('--- Starting Remote Backup ---');
  try {
    const { data: buildings, error: bError } = await supabase.from('buildings').select('*');
    if (bError) throw bError;

    const { data: paymentLogs, error: lError } = await supabase.from('payment_logs').select('*');
    if (lError) throw lError;

    const { data: config, error: cError } = await supabase.from('app_config').select('*');
    if (cError) throw cError;

    const backup = {
      timestamp: new Date().toISOString(),
      data: { buildings, payment_logs: paymentLogs, app_config: config }
    };

    const fileName = `backup_${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(backup, null, 2));
    console.log(`Success! Backup saved to: ${fileName}`);
  } catch (err) {
    console.error('Backup failed:', err.message);
  }
};

const resetDatabase = async () => {
  console.log('--- WARNING: Initiating Destructive Reset ---');
  // Simple check to prevent accidental runs
  if (process.argv[2] !== '--confirm') {
    console.log('Please run with --confirm to execute the reset.');
    return;
  }

  try {
    console.log('Clearing payment logs...');
    const { error: lError } = await supabase.from('payment_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (lError) throw lError;

    console.log('Resetting building metadata...');
    const { error: bError } = await supabase
      .from('buildings')
      .update({
        owner_name: '',
        house_no: '',
        phone_number: null,
        image_url: null,
        track_factor_1: false,
        track_factor_2: false,
        track_factor_3: false,
        floors: 1
      })
      .neq('building_id', '00000000-0000-0000-0000-000000000000');
    if (bError) throw bError;

    console.log('Success! Database has been reset to a fresh start.');
  } catch (err) {
    console.error('Reset failed:', err.message);
  }
};

const run = async () => {
  const command = process.argv[2];

  if (command === 'backup') {
    await backupData();
  } else if (command === 'reset' || command === '--confirm') {
    // If they just typed --confirm, assume reset
    await resetDatabase();
  } else {
    console.log('Usage: node maintenance.js [backup|reset]');
    console.log('  backup: Saves current Supabase data to a JSON file');
    console.log('  reset:  Clears payments and building details (requires --confirm)');
  }
};

run();

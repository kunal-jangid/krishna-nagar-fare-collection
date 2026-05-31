import { supabase } from '../lib/supabase';
import { AppLog } from '../types';

let currentUserName: string | null = null;

export const setLoggerUser = (name: string | null) => {
  currentUserName = name;
};

const logToSupabase = async (log: AppLog) => {
  try {
    const { error } = await supabase.from('system_logs').insert({
      level: log.level,
      message: log.message,
      details: log.details,
      user_name: log.user_name || currentUserName || 'System',
    });
    
    if (error) {
      console.warn('Failed to send log to Supabase:', error.message);
    }
  } catch (e) {
    // Silent fail to avoid infinite loops if supabase client itself fails
  }
};

export const logger = {
  info: (message: string, details?: any) => {
    console.log(`[INFO] ${message}`, details || '');
    logToSupabase({ level: 'INFO', message, details });
  },
  
  warn: (message: string, details?: any) => {
    console.warn(`[WARN] ${message}`, details || '');
    logToSupabase({ level: 'WARN', message, details });
  },
  
  error: (message: string, details?: any) => {
    console.error(`[ERROR] ${message}`, details || '');
    logToSupabase({ level: 'ERROR', message, details });
  }
};

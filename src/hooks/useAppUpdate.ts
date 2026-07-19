import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

function semverCompare(v1: string, v2: string) {
  const p1 = v1.replace(/^v/, '').split('.').map(Number);
  const p2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

export const useAppUpdate = () => {
  const checkForUpdates = async (manual = false) => {
    try {
      logger.info('Checking for updates via Supabase app_config...');
      const { data, error } = await supabase
        .from('app_config')
        .select('latest_version, apk_url')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'No config data returned from database');
      }

      const latestVersion = data.latest_version; // e.g. "1.0.1"
      const apkUrl = data.apk_url;
      
      if (!latestVersion) {
        if (manual) Alert.alert('Check for Updates', 'No release version configured in database.');
        return;
      }
      
      const currentVersion = Constants.expoConfig?.version || '1.1.0';
      
      logger.info('Comparing versions', { currentVersion, latestVersion });

      if (semverCompare(currentVersion, latestVersion) < 0) {
        Alert.alert(
          'Update Available!',
          `A new version (${latestVersion}) is available. Your current version is ${currentVersion}.`,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Download', 
              onPress: () => {
                if (apkUrl) {
                  Linking.openURL(apkUrl).catch(err => {
                    logger.error('Failed to open download URL', { error: err.message });
                    Alert.alert('Error', 'Could not open the download link.');
                  });
                } else {
                  Alert.alert('Error', 'Download link is not configured in database.');
                }
              } 
            }
          ]
        );
      } else {
        if (manual) {
          Alert.alert('Check for Updates', `You are already on the latest version (${currentVersion}).`);
        }
      }
    } catch (error: any) {
      logger.error('Failed checking for updates', { error: error.message });
      if (manual) {
        Alert.alert('Check for Updates', 'Failed to check for updates. Please check your internet/database connection.');
      }
    }
  };

  useEffect(() => {
    // Run update check on mount after a short delay
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return { checkForUpdates };
};

import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

const GITHUB_REPO_URL = 'https://api.github.com/repos/kunaljangid2k3/krishna-nagar-fare-collection/releases/latest';

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
      const response = await fetch(GITHUB_REPO_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Krishna-Nagar-Collections-App'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      const data = await response.json();
      const latestVersion = data.tag_name; // e.g. "v1.0.1" or "1.0.1"
      if (!latestVersion) {
        if (manual) Alert.alert('Check for Updates', 'No release tag found.');
        return;
      }
      
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      
      logger.info('Checking for updates', { currentVersion, latestVersion });

      if (semverCompare(currentVersion, latestVersion) < 0) {
        const downloadUrl = data.assets?.find((a: any) => a.name.endsWith('.apk'))?.browser_download_url || data.html_url;
        
        // Truncate long release notes if necessary
        let releaseNotes = '';
        if (data.body) {
          const cleanBody = data.body.substring(0, 200);
          releaseNotes = `\n\nWhat's New:\n${cleanBody}${data.body.length > 200 ? '...' : ''}`;
        }
        
        Alert.alert(
          'Update Available!',
          `A new version (${latestVersion}) is available. Your current version is ${currentVersion}.${releaseNotes}`,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Download', 
              onPress: () => {
                Linking.openURL(downloadUrl).catch(err => {
                  logger.error('Failed to open download URL', { error: err.message });
                  Alert.alert('Error', 'Could not open the download page.');
                });
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
        Alert.alert('Check for Updates', 'Failed to check for updates. Please check your internet connection.');
      }
    }
  };

  useEffect(() => {
    // Run update check on mount after a short delay to not block initial render/auth checks
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return { checkForUpdates };
};

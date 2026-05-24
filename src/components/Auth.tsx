import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

// This is required for the web browser to close correctly when auth finishes
WebBrowser.maybeCompleteAuthSession();

export const Auth = () => {
  // Handle the redirect URL when the app returns from the browser
  useEffect(() => {
    const handleDeepLink = (event: Linking.EventType) => {
      const url = event.url;
      if (url) {
        // Supabase handles the session internally if configured with deep links
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const performGoogleSignIn = async () => {
    // makeRedirectUri automatically handles Expo Go vs Standalone app routing
    const redirectUrl = makeRedirectUri({
      path: '/auth/callback',
    });
    
    console.log("Expo Redirect URI:", redirectUrl);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('OAuth error:', error.message);
        return;
      }

      if (data?.url) {
        // Just pass the url and redirectUrl directly
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          // React Native/Expo URL parsing workaround for fragments
          let targetUrl = result.url;
          if (targetUrl.includes('#')) {
            targetUrl = targetUrl.replace('#', '?');
          }
          
          const urlObj = new URL(targetUrl); 
          const access_token = urlObj.searchParams.get('access_token');
          const refresh_token = urlObj.searchParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }
        }
      }
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>Welcome</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to access Krishna Nagar Fare Collection
          </Text>
          <Button 
            mode="contained" 
            icon="google" 
            onPress={performGoogleSignIn}
            style={styles.button}
          >
            Sign in with Google
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    width: '100%',
  },
});

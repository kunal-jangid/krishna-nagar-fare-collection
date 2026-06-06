import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  private handleRestart = () => {
    // Simple reset to try and remount the App component
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong.</Text>
          <Text style={styles.subtitle}>
            The app encountered a critical error. Instead of closing, we caught it so you can see what happened.
          </Text>
          
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            {this.state.errorInfo && (
              <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
            )}
          </ScrollView>

          <Button mode="contained" onPress={this.handleRestart} style={styles.button}>
            Attempt Restart
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B00020',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  errorBox: {
    maxHeight: '50%',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    color: '#B00020',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stackText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    marginTop: 10,
  }
});

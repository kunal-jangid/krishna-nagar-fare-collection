import 'expo-asset';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import React from 'react';

// 1. Silence THREE.Clock deprecation warning (internal to Three.js and Fiber)
LogBox.ignoreLogs([
  'THREE.Clock',
  'Three.js',
  'THREE.Clock: This module has been deprecated',
  'THREE.Clock has been deprecated',
]);

// 2. Silence EXGL logs regarding pixelStorei
const originalLog = console.log;
console.log = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' && 
    (message.includes("gl.pixelStorei") || message.includes("doesn't support this parameter yet"))
  ) {
    return;
  }
  originalLog(...args);
};

const Root = () => React.createElement(ErrorBoundary, null, React.createElement(App, null));

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
registerRootComponent(Root);

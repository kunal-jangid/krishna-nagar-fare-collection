const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude the tools directory
config.resolver.blockList = [
  /.*[\\/]tools[\\/].*/,
];

config.resolver.sourceExts.push('cjs');
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg');

module.exports = config;

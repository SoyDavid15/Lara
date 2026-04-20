const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias firebase/auth to React Native specific build
const authDistPath = path.resolve(__dirname, 'node_modules/@firebase/auth/dist/rn/index.js');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'firebase/auth': authDistPath,
};

module.exports = config;

const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Include shared scripture and citation modules outside the mobile app directory.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(__dirname, '../..')])];
module.exports = config;

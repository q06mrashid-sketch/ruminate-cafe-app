const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const config = getDefaultConfig(__dirname);
config.resolver = config.resolver || {};
config.resolver.blockList = exclusionList([
  /__MACOSX\/.*/,
  /\.DS_Store$/,
  /.*\.bak(\..*)?$/,
  /.*\.backup(\..*)?$/,
  /.*\.bak_.*/,
  /src\/screens\/.*\.bak.*/,
  /mock-qr-codes\/.*/,
  /mock-wallet-passes\/.*/,
  /scripts\/.*/
]);
config.maxWorkers = Math.max(1, require('os').cpus().length - 1);
module.exports = config;

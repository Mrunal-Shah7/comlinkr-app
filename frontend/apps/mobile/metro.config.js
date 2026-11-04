// apps/mobile/metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix import.meta for web by transforming all JS through babel
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  babelTransformerPath: require.resolve('./metro.transformer.js'),
};

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['require', 'default', 'browser'],
};

module.exports = config;
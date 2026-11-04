// apps/mobile/babel.config.js

module.exports = function (api) {
  const isWeb = api.caller((caller) => caller?.platform === 'web');
  api.cache.using(() => isWeb);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@app': './app',
            '@assets': './assets',
            '@components': './src/components',
            '@features': './src/features',
            '@services': './src/services',
            '@store': './src/store',
            '@theme': './src/theme',
            '@shared': './src/shared',
            '@lib': './src/lib',
            '@config': './src/config',
          },
        },
      ],
      // Reanimated/worklets Babel plugin is provided by babel-preset-expo on SDK 57+
    ],
  };
};

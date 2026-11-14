// apps/mobile/metro.transformer.js

// @expo/metro-config is not a direct dependency of this app. With pnpm (EAS Build) only direct dependencies are
// visible from here, so resolve it from where `expo` (which depends on it) is installed.
const upstreamTransformer = require(
  require.resolve('@expo/metro-config/build/babel-transformer', {
    paths: [require.resolve('expo/metro-config')],
  }),
);

module.exports.transform = async function (params) {
  const { filename, options } = params;
  const isWeb = options?.platform === 'web';

  // Replace import.meta with a safe equivalent for web
  if (isWeb && params.src && params.src.includes('import.meta')) {
    params = {
      ...params,
      src: params.src
        .replace(/import\.meta\.url/g, '""')
        .replace(/import\.meta\.env/g, '{}')
        .replace(/import\.meta/g, '{}'),
    };
  }

  return upstreamTransformer.transform(params);
};
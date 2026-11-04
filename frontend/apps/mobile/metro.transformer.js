// apps/mobile/metro.transformer.js

const upstreamTransformer = require('@expo/metro-config/build/babel-transformer');

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
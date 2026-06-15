export default {
  entry: ['serverless.ts'],
  ignore: ['knip.config.ts'],
  ignoreDependencies: [/^@mridang\/serverless-/, 'preact'],
};

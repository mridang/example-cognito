export default {
  entry: ['serverless.ts'],
  ignoreDependencies: [/^@mridang\/serverless-/, 'preact', 'aws-lambda'],
};

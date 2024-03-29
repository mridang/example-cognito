import type { AWS } from '@serverless/typescript';
import { AwsLambdaRuntime } from '@serverless/typescript';
import packageJson from './package.json';
import { secretName } from './src/constants';

const parentDomain = process.env.PARENT_DOMAIN;
const hostedZoneId = process.env.HOSTED_ZONE_ID;
const fullDomainName = `${packageJson.name}.${parentDomain}`;

const serverlessConfiguration: AWS = {
  service: packageJson.name,
  frameworkVersion: '3',
  plugins: ['serverless-plugin-typescript'],
  package: {
    individually: false,
    patterns: [
      'public/**/*',
      '**/*.hbs',
      '**/*.html',
      '!test',
      '!jest.config.js',
      '!jest.config.js.map',
      '!prettier.config.js',
      '!prettier.config.js.map',
      '!serverless.js',
      '!serverless.js.map',
      '!package.json',
    ],
  },
  provider: {
    stage: '${opt:stage, "dev"}',
    tags: {
      'sls:meta:project': packageJson.name,
      'sls:meta:repo': packageJson.repository.url,
      'sls:meta:environment': '${opt:stage, "dev"}',
    },
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
      ACCOUNT_ID: '${aws:accountId}',
      NODE_ENV: '${self:provider.stage}',
      SERVICE_NAME: packageJson.name,
      DOMAIN_NAME: fullDomainName,
    },
    name: 'aws',
    logRetentionInDays: 14,
    tracing: {
      lambda: true,
    },
    runtime: `nodejs${packageJson.engines.node}` as AwsLambdaRuntime,
    architecture: 'arm64',
    memorySize: 256,
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn:aws:secretsmanager',
                  { Ref: 'AWS::Region' },
                  { Ref: 'AWS::AccountId' },
                  'secret',
                  `${secretName}-*`,
                ],
              ],
            },
          },
        ],
      },
    },
  },
  resources: {
    Resources: {
      SiteCertificate: {
        Type: 'AWS::CertificateManager::Certificate',
        Properties: {
          DomainName: fullDomainName,
          ValidationMethod: 'DNS',
        },
      },
      CloudFrontDistribution: {
        Type: 'AWS::CloudFront::Distribution',
        Properties: {
          DistributionConfig: {
            Enabled: true,
            PriceClass: 'PriceClass_All',
            HttpVersion: 'http2and3',
            IPV6Enabled: true,
            Origins: [
              {
                Id: 'LambdaOrigin',
                DomainName: {
                  'Fn::Select': [
                    2,
                    {
                      'Fn::Split': [
                        '/',
                        {
                          'Fn::GetAtt': [
                            'ProbotLambdaFunctionUrl',
                            'FunctionUrl',
                          ],
                        },
                      ],
                    },
                  ],
                },
                CustomOriginConfig: {
                  HTTPSPort: 443,
                  OriginProtocolPolicy: 'https-only',
                },
              },
            ],
            DefaultCacheBehavior: {
              TargetOriginId: 'LambdaOrigin',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: [
                'GET',
                'HEAD',
                'OPTIONS',
                'PUT',
                'PATCH',
                'POST',
                'DELETE',
              ],
              CachedMethods: ['GET', 'HEAD'],
              CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
              OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
              Compress: true,
            },
            CacheBehaviors: [
              {
                PathPattern: '/static/*',
                TargetOriginId: 'LambdaOrigin',
                ViewerProtocolPolicy: 'redirect-to-https',
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                CachedMethods: ['GET', 'HEAD'],
                CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                Compress: true,
              },
            ],
            Aliases: [fullDomainName],
            ViewerCertificate: {
              AcmCertificateArn: {
                Ref: 'SiteCertificate',
              },
              SslSupportMethod: 'sni-only',
              MinimumProtocolVersion: 'TLSv1.2_2021',
            },
          },
        },
      },
      DNSRecordForCloudFront: {
        Type: 'AWS::Route53::RecordSetGroup',
        Properties: {
          HostedZoneId: hostedZoneId,
          RecordSets: [
            {
              Name: fullDomainName,
              Type: 'A',
              SetIdentifier: 'Primary',
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront's Hosted Zone ID
                DNSName: {
                  'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'],
                },
                EvaluateTargetHealth: true,
              },
              Failover: 'PRIMARY',
            },
            {
              Name: fullDomainName,
              Type: 'AAAA',
              SetIdentifier: 'PrimaryIPv6',
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront's Hosted Zone ID
                DNSName: {
                  'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'],
                },
                EvaluateTargetHealth: true,
              },
              Failover: 'PRIMARY',
            },
          ],
        },
      },
      MySecretsManagerSecret: {
        Type: 'AWS::SecretsManager::Secret',
        Properties: {
          Name: secretName,
          Description: 'Secrets for my Github application',
          SecretString: JSON.stringify({
            APP_ID: '',
            CLIENT_ID: '',
            CLIENT_SECRET: '',
            WEBHOOK_SECRET: '',
            PRIVATE_KEY: '',
          }),
        },
      },
    },
  },
  functions: {
    probot: {
      handler: 'src/lambda.handler',
      timeout: 60,
      url: true,
    },
  },
};

module.exports = serverlessConfiguration;

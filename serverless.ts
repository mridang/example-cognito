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
      CognitoUserPool: {
        Type: 'AWS::Cognito::UserPool',
        Properties: {
          AccountRecoverySetting: {
            RecoveryMechanisms: [
              {
                Name: 'verified_email',
                Priority: 1,
              },
            ],
          },
          AdminCreateUserConfig: {
            InviteMessageTemplate: {
              EmailMessage:
                'Use the username {username} and the temporary password {####} to log in for the first time',
              EmailSubject: 'Your Invitation to Join Our Service',
            },
            UnusedAccountValidityDays: 180,
          },
          AliasAttributes: ['email'],
          AutoVerifiedAttributes: ['email'],
          DeletionProtection: 'ACTIVE',
          EmailVerificationMessage:
            'Thank you for signing up. Please click the link below to verify your email address: {####}',
          EmailVerificationSubject: 'Verify Your Email Address',
          EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
          MfaConfiguration: 'OPTIONAL',
          Policies: {
            PasswordPolicy: {
              MinimumLength: 8,
              RequireLowercase: true,
              RequireNumbers: true,
              RequireSymbols: true,
              RequireUppercase: true,
            },
          },
          Schema: [
            {
              Name: 'language',
              AttributeDataType: 'String',
              Mutable: true,
              Required: false,
            },
          ],
          UserPoolName: 'MyUserPool',
          VerificationMessageTemplate: {
            EmailMessage:
              'Welcome to AwesomeApp! Click the link below to verify your email address: {####}. If you did not sign up for AwesomeApp, you can safely ignore this email.',
            EmailMessageByLink:
              "Welcome to AwesomeApp! Click the link below to verify your email address: <a href='{##Verify Email##}'>Verify Email</a>. If you did not sign up for AwesomeApp, you can safely ignore this email.",
            EmailSubject: 'Verify your email for AwesomeApp',
            EmailSubjectByLink: 'Verify your email for AwesomeApp',
            SmsMessage:
              'Welcome to AwesomeApp! Your verification code is {####}.',
          },
        },
      },
      CognitoUserPoolClient: {
        Type: 'AWS::Cognito::UserPoolClient',
        Properties: {
          AccessTokenValidity: 1440,
          AllowedOAuthFlows: ['code'],
          AllowedOAuthFlowsUserPoolClient: true,
          AllowedOAuthScopes: ['openid', 'email', 'profile'],
          CallbackURLs: ['https://example.com/callback'],
          ClientName: 'MyAppClient',
          DefaultRedirectURI: 'https://example.com/welcome',
          EnablePropagateAdditionalUserContextData: false,
          EnableTokenRevocation: true,
          ExplicitAuthFlows: [
            'ALLOW_USER_SRP_AUTH',
            'ALLOW_REFRESH_TOKEN_AUTH',
          ],
          GenerateSecret: false,
          IdTokenValidity: 24,
          LogoutURLs: ['https://example.com/logout'],
          PreventUserExistenceErrors: 'ENABLED',
          ReadAttributes: ['email', 'custom:language'],
          RefreshTokenValidity: 30,
          SupportedIdentityProviders: ['COGNITO'],
          TokenValidityUnits: {
            AccessToken: 'hours',
            IdToken: 'hours',
            RefreshToken: 'days',
          },
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          WriteAttributes: ['email', 'custom:language'],
        },
      },
      UserPoolUICustomization: {
        Type: 'AWS::Cognito::UserPoolUICustomizationAttachment',
        Properties: {
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          ClientId: {
            Ref: 'CognitoUserPoolClient',
          },
          CSS: '.banner-customizable { background: linear-gradient(#9940B8, #C27BDB) }',
        },
      },
      AdminUserGroup: {
        Type: 'AWS::Cognito::UserPoolGroup',
        Properties: {
          GroupName: 'AdminUsers',
          Description: 'Group for admin users',
          Precedence: 1,
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
        },
      },
      GeneralUserGroup: {
        Type: 'AWS::Cognito::UserPoolGroup',
        Properties: {
          GroupName: 'GeneralUsers',
          Description: 'Group for general users',
          Precedence: 2,
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
        },
      },
      CognitoLogGroup: {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
          LogGroupName: '/aws/cognito/logs',
          RetentionInDays: 365,
          LogGroupClass: 'INFREQUENT_ACCESS',
        },
      },
      CognitoLoggingConfiguration: {
        Type: 'AWS::Cognito::LogDeliveryConfiguration',
        Properties: {
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          LogConfigurations: [
            {
              CloudWatchLogsConfiguration: {
                LogGroupArn: {
                  Ref: 'CognitoLogGroup',
                },
              },
            },
          ],
        },
      },
      Certificate: {
        Type: 'AWS::CertificateManager::Certificate',
        Properties: {
          DomainName: 'auth.agarwal.la',
          ValidationMethod: 'DNS',
        },
      },
      UserPoolDomain: {
        Type: 'AWS::Cognito::UserPoolDomain',
        Properties: {
          Domain: `auth.${parentDomain}`,
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          CustomDomainConfig: {
            CertificateArn: {
              Ref: 'Certificate',
            },
          },
        },
      },
      DNSRecord: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneId: hostedZoneId,
          Name: `auth.${parentDomain}`,
          Type: 'A',
          AliasTarget: {
            DNSName: {
              'Fn::GetAtt': ['UserPoolDomain', 'CloudFrontDistribution'],
            },
            HostedZoneId: 'Z2FDTNDATAQYW2',
          },
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

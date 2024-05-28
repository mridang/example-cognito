import type { AWS } from '@serverless/typescript';
import { AwsLambdaRuntime } from '@serverless/typescript';
import packageJson from './package.json';
import { secretName } from './src/constants';
import { readFileSync } from 'node:fs';
import jsesc from 'jsesc';

const parentDomain = process.env.PARENT_DOMAIN;
const hostedZoneId = process.env.HOSTED_ZONE_ID;
const fullDomainName = `${packageJson.name}.${parentDomain}`;
const sessionDuration = 30;

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
      COGNITO_SESSION_DURATION: `${sessionDuration * 86400}`,
      COGNITO_CLIENT_ID: {
        'Fn::GetAtt': ['CognitoUserPoolClient', 'ClientId'],
      },
      COGNITO_DOMAIN: `https://auth.${fullDomainName}`,
      COGNITO_REDIRECT_URI: `https://${fullDomainName}/callback`,
      COGNITO_LOGOUT_REDIRECT_URI: `https://${fullDomainName}/loggedout`,
      COGNITO_USER_POOL_ID: {
        'Fn::GetAtt': ['CognitoUserPool', 'UserPoolId'],
      },
      COGNITO_REGION: {
        Ref: 'AWS::Region',
      },
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
      EmailIdentity: {
        Type: 'AWS::SES::EmailIdentity',
        Properties: {
          EmailIdentity: `auth.${fullDomainName}`,
        },
      },
      Route53RecordSetMailFromMX: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneId: hostedZoneId,
          Name: `auth.${fullDomainName}`,
          Type: 'MX',
          TTL: '60',
          ResourceRecords: [
            {
              'Fn::Sub': '10 inbound-smtp.${AWS::Region}.amazonaws.com',
            },
          ],
        },
      },
      Route53RecordSetMailFromTXT: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneId: hostedZoneId,
          Name: `auth.${fullDomainName}`,
          Type: 'TXT',
          TTL: '60',
          ResourceRecords: ['"v=spf1 include:amazonses.com ~all"'],
        },
      },
      Route53RecordSetSPF: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneId: hostedZoneId,
          Name: `auth.${fullDomainName}`,
          Type: 'TXT',
          TTL: '60',
          ResourceRecords: ['"v=spf1 include:amazonses.com ~all"'],
        },
      },
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
            SENTRY_DSN: 'https://x@x.ingest.us.sentry.io/x',
          }),
        },
      },
      PostConfirmationTriggerLambda: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          FunctionName: `${packageJson.name}-\${self:provider.stage}-cognito-trigger-post-confirmation`,
          Handler: 'index.handler',
          Role: {
            'Fn::GetAtt': ['PostConfirmationTriggerLambdaExecutionRole', 'Arn'],
          },
          Architectures: ['arm64'],
          Code: {
            ZipFile: `
          exports.handler = async (event) => {
            return event;
          };
        `,
          },
          Runtime: `nodejs${packageJson.engines.node}`,
          MemorySize: 128,
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active',
          },
        },
      },
      PostConfirmationTriggerLambdaExecutionRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: 'LambdaCognitoPolicy',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: [
                      'logs:CreateLogGroup',
                      'logs:CreateLogStream',
                      'logs:PutLogEvents',
                    ],
                    Resource: 'arn:aws:logs:*:*:*',
                  },
                  {
                    Effect: 'Allow',
                    Action: ['cognito-idp:AdminAddUserToGroup'],
                    Resource: '*',
                  },
                ],
              },
            },
          ],
        },
      },
      PostConfirmationTriggerLambdaInvokePermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['PostConfirmationTriggerLambda', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: 'cognito-idp.amazonaws.com',
          SourceArn: {
            'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
          },
        },
      },
      PreSignUpTriggerLambda: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          FunctionName: `${packageJson.name}-\${self:provider.stage}-cognito-trigger-pre-signup`,
          Handler: 'index.handler',
          Role: {
            'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'],
          },
          Architectures: ['arm64'],
          Code: {
            ZipFile: `
          exports.handler = async (event) => {
            return event;
          };
        `,
          },
          Runtime: `nodejs${packageJson.engines.node}`,
          MemorySize: 128,
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active',
          },
        },
      },
      LambdaExecutionRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: 'LambdaCognitoPolicy',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: [
                      'logs:CreateLogGroup',
                      'logs:CreateLogStream',
                      'logs:PutLogEvents',
                    ],
                    Resource: 'arn:aws:logs:*:*:*',
                  },
                  {
                    Effect: 'Allow',
                    Action: [
                      'cognito-idp:AdminCreateUser',
                      'cognito-idp:AdminDeleteUser',
                      'cognito-idp:AdminUpdateUserAttributes',
                      'cognito-idp:AdminGetUser',
                      'cognito-idp:ListUsers',
                      'cognito-idp:AdminInitiateAuth',
                      'cognito-idp:AdminRespondToAuthChallenge',
                    ],
                    Resource: '*',
                  },
                ],
              },
            },
          ],
        },
      },
      LambdaInvokePermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['PreSignUpTriggerLambda', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: 'cognito-idp.amazonaws.com',
          SourceArn: {
            'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
          },
        },
      },
      CognitoUserPool: {
        Type: 'AWS::Cognito::UserPool',
        Properties: {
          UsernameAttributes: ['email'],
          AccountRecoverySetting: {
            RecoveryMechanisms: [
              {
                Name: 'verified_email',
                Priority: 1,
              },
            ],
          },
          AutoVerifiedAttributes: ['email'],
          DeletionProtection: 'INACTIVE', // This should be set to active in production
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
              TemporaryPasswordValidityDays: 2,
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
          // EmailConfiguration: {
          //   EmailSendingAccount: 'DEVELOPER',
          //   From: `noreply@auth.${fullDomainName}`,
          //   ReplyToEmailAddress: `noreply@auth.${fullDomainName}`,
          //   SourceArn: {
          //     'Fn::Sub': `arn:$\{AWS::Partition}:ses:$\{AWS::Region}:$\{AWS::AccountId}:identity/noreply@auth.${fullDomainName}`,
          //   },
          // },
          VerificationMessageTemplate: {
            DefaultEmailOption: 'CONFIRM_WITH_CODE',
          },
          LambdaConfig: {
            PreSignUp: {
              'Fn::GetAtt': ['PreSignUpTriggerLambda', 'Arn'],
            },
            CustomMessage: {
              'Fn::GetAtt': ['CustomMessageLambda', 'Arn'],
            },
            PostConfirmation: {
              'Fn::GetAtt': ['PostConfirmationTriggerLambda', 'Arn'],
            },
          },
        },
      },
      CognitoUserPoolClient: {
        Type: 'AWS::Cognito::UserPoolClient',
        Properties: {
          AccessTokenValidity: 24,
          AllowedOAuthFlows: ['code'],
          AllowedOAuthFlowsUserPoolClient: true,
          AllowedOAuthScopes: [
            'openid',
            'email',
            'profile',
            'aws.cognito.signin.user.admin',
          ],
          CallbackURLs: [
            `https://${fullDomainName}/callback`,
            `https://${fullDomainName}/welcome`,
          ],
          ClientName: 'Web',
          DefaultRedirectURI: `https://${fullDomainName}/welcome`,
          EnablePropagateAdditionalUserContextData: false,
          EnableTokenRevocation: true,
          ExplicitAuthFlows: [
            'ALLOW_USER_SRP_AUTH',
            'ALLOW_REFRESH_TOKEN_AUTH',
          ],
          GenerateSecret: false,
          IdTokenValidity: 24,
          LogoutURLs: [`https://${fullDomainName}/logout`],
          PreventUserExistenceErrors: 'ENABLED',
          ReadAttributes: [
            'email',
            'given_name',
            'family_name',
            'locale',
            'custom:language',
          ],
          RefreshTokenValidity: sessionDuration,
          SupportedIdentityProviders: ['COGNITO'],
          TokenValidityUnits: {
            AccessToken: 'hours',
            IdToken: 'hours',
            RefreshToken: 'days',
          },
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          WriteAttributes: [
            'email',
            'given_name',
            'family_name',
            'locale',
            'custom:language',
          ],
        },
      },
      CognitoUserPoolRiskConfiguration: {
        Type: 'AWS::Cognito::UserPoolRiskConfigurationAttachment',
        Properties: {
          UserPoolId: { Ref: 'CognitoUserPool' },
          ClientId: 'ALL',
          CompromisedCredentialsRiskConfiguration: {
            Actions: {
              EventAction: 'BLOCK',
            },
          },
          AccountTakeoverRiskConfiguration: {
            Actions: {
              HighAction: {
                EventAction: 'BLOCK',
                Notify: true,
              },
              MediumAction: {
                EventAction: 'MFA_IF_CONFIGURED',
                Notify: true,
              },
              LowAction: {
                EventAction: 'NO_ACTION',
                Notify: false,
              },
            },
          },
        },
      },
      // UserPoolUICustomization: {
      //   Type: 'AWS::Cognito::UserPoolUICustomizationAttachment',
      //   Properties: {
      //     UserPoolId: {
      //       Ref: 'CognitoUserPool',
      //     },
      //     ClientId: {
      //       Ref: 'CognitoUserPoolClient',
      //     },
      //     CSS: '.banner-customizable { background: linear-gradient(#9940B8, #C27BDB) }',
      //   },
      // },
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
                  'Fn::Sub':
                    'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${CognitoLogGroup}',
                },
              },
              LogLevel: 'ERROR',
              EventSource: 'userNotification',
            },
          ],
        },
      },
      Certificate: {
        Type: 'AWS::CertificateManager::Certificate',
        Properties: {
          DomainName: `auth.${fullDomainName}`,
          ValidationMethod: 'DNS',
        },
      },
      UserPoolDomain: {
        Type: 'AWS::Cognito::UserPoolDomain',
        Properties: {
          Domain: `auth.${fullDomainName}`,
          UserPoolId: {
            Ref: 'CognitoUserPool',
          },
          CustomDomainConfig: {
            CertificateArn: {
              Ref: 'Certificate',
            },
          },
        },
        DependsOn: ['DNSRecordForCloudFront'],
      },
      DNSRecord: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneId: hostedZoneId,
          Name: `auth.${fullDomainName}`,
          Type: 'A',
          AliasTarget: {
            DNSName: {
              'Fn::GetAtt': ['UserPoolDomain', 'CloudFrontDistribution'],
            },
            HostedZoneId: 'Z2FDTNDATAQYW2',
          },
        },
      },
      CustomMessageLambda: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          FunctionName: `${packageJson.name}-\${self:provider.stage}-cognito-trigger-custom-message`,
          Handler: 'index.handler',
          Role: {
            'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'],
          },
          Architectures: ['arm64'],
          Code: {
            ZipFile: `
              exports.handler = async (event) => {
                const userAttributes = event.request.userAttributes;
                const codeParameter = event.request.codeParameter;
                const usernameParameter = event.request.usernameParameter;
                const requestJson = JSON.stringify(event.request, null, 2);

                switch (event.triggerSource) {
                    case 'CustomMessage_SignUp':
                        event.response.emailSubject = "You've been invited";
                        event.response.emailMessage = \`${jsesc(readFileSync('etc/emails/custommessage_signup.html', 'utf-8'))}\`.replace(/{{(.*?)}}/g, (match, p1) => event.request[p1]).replace(/{{(.*?)}}/g, (match, p1) => event.callerContext[p1]);
                        break;

                    case 'CustomMessage_AdminCreateUser':
                        event.response.emailSubject = "You've been invited";
                        event.response.emailMessage = \`${jsesc(readFileSync('etc/emails/custommessage_admincreateuser.html', 'utf-8'))}\`.replace(/{{(.*?)}}/g, (match, p1) => event.request[p1]).replace(/{{(.*?)}}/g, (match, p1) => event.callerContext[p1]);
                        break;

                    case 'CustomMessage_ResendCode':
                        event.response.emailSubject = "Your Verification Code resent";
                        event.response.emailMessage = \`${jsesc(readFileSync('etc/emails/custommessage_resendcode.html', 'utf-8'))}\`.replace(/{{(.*?)}}/g, (match, p1) => event.request[p1]).replace(/{{(.*?)}}/g, (match, p1) => event.callerContext[p1]);
                        break;

                    case 'CustomMessage_ForgotPassword':
                        event.response.emailSubject = "Password Reset Requests";
                        event.response.emailMessage = \`${jsesc(readFileSync('etc/emails/custommessage_forgotpassword.html', 'utf-8'))}\`.replace(/{{(.*?)}}/g, (match, p1) => event.request[p1]).replace(/{{(.*?)}}/g, (match, p1) => event.callerContext[p1]);
                        break;
                }

                return event;
              };
            `,
          },
          Runtime: `nodejs${packageJson.engines.node}`,
          MemorySize: 128,
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active',
          },
        },
      },
      CustomMessageLambdaInvokePermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: {
            'Fn::GetAtt': ['CustomMessageLambda', 'Arn'],
          },
          Action: 'lambda:InvokeFunction',
          Principal: 'cognito-idp.amazonaws.com',
          SourceArn: {
            'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
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

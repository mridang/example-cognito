import { expect } from '@jest/globals';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../src/lambda';
import { HttpStatus } from '@nestjs/common';

describe('Lambda Handler', () => {
  it('should log output on /health route', async () => {
    const context: Partial<Context> = {
      functionName: 'testFunction',
    };

    await handler(
      {
        httpMethod: 'GET',
        path: '/health',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        requestContext: {
          resourceId: 'testResourceId',
          apiId: 'testApiId',
          resourcePath: '/health',
          httpMethod: 'GET',
          requestId: 'testRequestId',
          accountId: 'testAccountId',
          stage: 'testStage',
          identity: {
            cognitoIdentityPoolId: null,
            accountId: null,
            cognitoIdentityId: null,
            caller: null,
            apiKey: null,
            sourceIp: '123.123.123.123',
            cognitoAuthenticationType: null,
            cognitoAuthenticationProvider: null,
            userArn: null,
            userAgent: 'Custom User Agent String',
            user: null,
          },
          path: '/health',
        },
      } as APIGatewayProxyEvent,
      context as Context,
      (error, result) => {
        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result?.statusCode).toEqual(HttpStatus.OK);
      },
    );
  });
});

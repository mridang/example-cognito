import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

export default {
  poolClientId: process.env.COGNITO_CLIENT_ID as string,
  cognitoAuthDomain: process.env.COGNITO_DOMAIN as string,
  postCallbackUri: process.env.COGNITO_REDIRECT_URI as string,
  postLogoutUri: process.env.COGNITO_LOGOUT_REDIRECT_URI as string,
  userPoolId: process.env.COGNITO_USER_POOL_ID as string,
  userPoolRegion: process.env.COGNITO_REGION as string,
  sessionDurationDays: Number(process.env.COGNITO_SESSION_DURATION as string),
};

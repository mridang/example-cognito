// src/profile/profile.controller.ts
import { Controller, Body, Req, Get, Render, Res } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  UpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Request } from 'express';
import { UpdateProfileDto } from './update-profile.dto';

@Controller('profile')
export class ProfileController {
  private cognitoClient: CognitoIdentityProviderClient;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: 'YOUR_AWS_REGION',
    });
  }

  @Get()
  @Render('profile')
  async getUpdatePage(@Req() req: Request) {
    console.log(JSON.stringify(req.user));
    // @ts-expect-error dffgs gssf
    const accessToken = req.user.signInUserSession.accessToken.jwtToken;

    const command = new GetUserCommand({ AccessToken: accessToken });
    const userData = await this.cognitoClient.send(command);

    console.log(JSON.stringify(userData));

    return {
      givenName: 'moo',
      familyName: 'mm',
    };
  }

  async updateProfile(
    @Req() req: Request,
    @Res() res: Response,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const { givenName, familyName } = updateProfileDto;
    // @ts-expect-error dggegege
    const accessToken = req.user.signInUserSession.accessToken.jwtToken;

    const updateParams = {
      AccessToken: accessToken,
      UserAttributes: [
        { Name: 'given_name', Value: givenName },
        { Name: 'family_name', Value: familyName },
      ],
    };

    const updateCommand = new UpdateUserAttributesCommand(updateParams);
    await this.cognitoClient.send(updateCommand);

    // // Refresh tokens after updating profile
    // const refreshToken = req.user.signInUserSession.refreshToken.token;
    //
    // const refreshParams = {
    //   AuthFlow: 'REFRESH_TOKEN_AUTH',
    //   ClientId: 'YOUR_COGNITO_APP_CLIENT_ID',
    //   AuthParameters: {
    //     REFRESH_TOKEN: refreshToken,
    //   },
    // };
    //
    // const refreshCommand = new InitiateAuthCommand(refreshParams);
    // const response = await this.cognitoClient.send(refreshCommand);
    //
    // // Update tokens in session or client storage
    // req.user.signInUserSession.accessToken.jwtToken =
    //   response.AuthenticationResult.AccessToken;
    // req.user.signInUserSession.idToken.jwtToken =
    //   response.AuthenticationResult.IdToken;
    // req.user.signInUserSession.refreshToken.token =
    //   response.AuthenticationResult.RefreshToken;
    //
    // res.send({
    //   message: 'User attributes updated and tokens refreshed successfully',
    // });
  }
}

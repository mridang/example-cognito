import { Body, Controller, Get, Post, Render, Req } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  UpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Request } from '@mridang/nestjs-defaults';
import { UpdateProfileDto } from './update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly cognitoClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(),
  ) {
    //
  }

  @Get()
  @Render('profile')
  async getUpdatePage(@Req() req: Request) {
    const accessToken = req.cookies['at'];
    const userData = await this.cognitoClient.send(
      new GetUserCommand({ AccessToken: accessToken }),
    );

    return (
      userData.UserAttributes?.reduce(
        (acc, { Name, Value }) => (Name ? { ...acc, [Name]: Value } : acc),
        {
          //
        },
      ) || {}
    );
  }

  @Post()
  async updateProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const accessToken = req.cookies['at'];
    console.log(JSON.stringify(updateProfileDto));

    await this.cognitoClient.send(
      new UpdateUserAttributesCommand({
        AccessToken: accessToken,
        UserAttributes: [
          { Name: 'given_name', Value: updateProfileDto.given_name },
          { Name: 'family_name', Value: updateProfileDto.family_name },
        ],
      }),
    );

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

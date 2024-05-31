import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Render,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AdminSetUserMFAPreferenceCommand,
  AssociateSoftwareTokenCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as QRCode from 'qrcode';
import cognitoConfig from './constants';

@Controller('totp')
export class MfaController {
  private readonly cognitoClient = new CognitoIdentityProviderClient();

  @Get('setup')
  @Render('totp')
  async renderSetupPage(@Req() req: Request) {
    const accessToken = req.cookies.at;

    const getUserResult = await this.cognitoClient.send(
      new GetUserCommand({ AccessToken: accessToken }),
    );

    if (getUserResult.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA')) {
      return { message: 'MFA is already enabled' };
    } else {
      const associateResult = await this.cognitoClient.send(
        new AssociateSoftwareTokenCommand({ AccessToken: accessToken }),
      );

      return {
        qrcode: await QRCode.toDataURL(
          `otpauth://totp/AWSCognito:${getUserResult.Username}?secret=${associateResult.SecretCode}&issuer=AWSCognito`,
        ),
      };
    }
  }

  @Post('verify')
  async verifyTOTP(@Req() req: Request, @Body() body: { code: string }) {
    const accessToken = req.cookies.at;

    const getUserResult = await this.cognitoClient.send(
      new GetUserCommand({ AccessToken: accessToken }),
    );

    if (getUserResult.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA')) {
      throw new BadRequestException('MFA is already enabled');
    } else {
      const verifyCodeResult = await this.cognitoClient.send(
        new VerifySoftwareTokenCommand({
          AccessToken: accessToken,
          UserCode: body.code,
        }),
      );

      if (verifyCodeResult.Status === 'SUCCESS') {
        await this.cognitoClient.send(
          new AdminSetUserMFAPreferenceCommand({
            Username: getUserResult.Username,
            UserPoolId: cognitoConfig.userPoolId,
            SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
          }),
        );
      } else {
        throw new BadRequestException('Error: Verification failed');
      }
    }
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ProfileController } from './profile.controller';
import { MfaController } from './totp.controller';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

@Module({
  imports: [PassportModule, JwtModule.register({}), HttpModule],
  controllers: [AuthController, ProfileController, MfaController],
  providers: [
    {
      provide: CognitoIdentityProviderClient,
      useFactory: () => {
        return new CognitoIdentityProviderClient();
      },
    },
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}

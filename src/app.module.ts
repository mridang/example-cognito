import { Global, Module } from '@nestjs/common';
import { secretName } from './constants';
import { DefaultsModule } from '@mridang/nestjs-defaults';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';

@Global()
@Module({
  imports: [
    DefaultsModule.register({
      configName: secretName,
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    //
  ],
  exports: [
    //
  ],
})
export class AppModule {
  //
}

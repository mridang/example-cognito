import { Global, Module } from '@nestjs/common';
import { secretName } from './constants.js';
import pkg from '@mridang/nestjs-defaults';
const { DefaultsModule } = pkg;
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';

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

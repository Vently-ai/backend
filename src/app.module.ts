import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';

// Feature modules
// import { SessionsModule } from './modules/sessions/sessions.module.js';
import { DiaryModule } from './modules/diary/diary.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { MicroclientModule } from './modules/microclient/microclient.module.js';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';

@Module({
  imports: [
    // Database modules
    PrismaModule,

    // Feature modules
    UserModule,
    AuthModule,
    DiaryModule,
    SessionsModule,
    MicroclientModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

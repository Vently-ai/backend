import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { MicroclientModule } from '../microclient/microclient.module.js';
import { DiaryModule } from '../diary/diary.module.js';

@Module({
  imports: [MicroclientModule, DiaryModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}

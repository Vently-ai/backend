import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { DiaryService } from '../diary/diary.service.js';

@Controller('sessions')
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private diaryService: DiaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Req() req: any) {
    return this.sessionsService.createSession(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSessions(@Query('mode') mode: string, @Req() req: any) {
    return this.sessionsService.getSessions(req.user.sub, mode);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body('message') message: string,
    @Req() req: any,
  ) {
    return this.sessionsService.sendMessage(sessionId, req.user.sub, message);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.sessionsService.getMessages(sessionId, req.user.sub);
  }

  @UseGuards(ApiKeyGuard)
  @Put(':sessionId/user/state') // Changed from POST to PUT to match microservice expectations
  async updateUserState(
    @Param('sessionId') sessionId: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.sessionsService.updateUserState(sessionId, req.user.sub, data);
  }

  // Moved from DiaryController to SessionsController to align with microservice URLs
  @UseGuards(ApiKeyGuard)
  @Post(':sessionId/user/summarized_diary')
  async createSummary(
    @Param('sessionId') sessionId: string,
    @Body('summarized_content') summarizedContent: string,
    @Req() req: any,
  ) {
    return this.diaryService.createSummary(sessionId, req.user.sub, summarizedContent);
  }

  @UseGuards(ApiKeyGuard)
  @Get(':sessionId/user/summarized_diary')
  async getSummarizedDiary(
    @Param('sessionId') sessionId: string,
    @Query('n', new ParseIntPipe({ optional: true })) n = 1,
    @Query('sf', new ParseIntPipe({ optional: true })) sf = 0,
    @Req() req: any,
  ) {
    return this.diaryService.getSummarizedDiary(sessionId, req.user.sub, n, sf);
  }
}

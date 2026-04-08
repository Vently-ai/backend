import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DiaryService } from './diary.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('diary')
export class DiaryController {
  constructor(private diaryService: DiaryService) {}

  // Retrieve full diary content and date for a specific session ID
  @UseGuards(JwtAuthGuard)
  @Get('user/diary')
  async getDiaryBySession(@Query('id') sessionId: string, @Req() req: any) {
    return this.diaryService.getDiaryBySession(sessionId, req.user.sub);
  }
}

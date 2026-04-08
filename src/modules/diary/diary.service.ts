import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';

@Injectable()
export class DiaryService {
  constructor(private prisma: PrismaService) {}

  async createSummary(sessionId: string, userId: string, summarizedContent: string) {
    // Validate session belongs to user
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    // Update instead of insert, using sessionId as Diary PK
    const updated = await this.prisma.diary.update({
      where: { sessionId },
      data: { summarizedContent },
    });

    return { status: 'ok' };
  }

  async getSummarizedDiary(sessionId: string, userId: string, n: number, sf: number) {
    // 1️⃣ Validate session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    // 2️⃣ Fetch latest n entries for user
    const latestEntries = await this.prisma.diary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: n,
    });

    // 3️⃣ Filter/Pad as per POC logic
    const filteredEntries = latestEntries.slice(sf);
    const expectedLen = Math.max(n - sf, 0);

    const summaries = filteredEntries.map((e) => e.summarizedContent || null);

    while (summaries.length < expectedLen) {
      summaries.push(null);
    }

    return { summarized_entries: summaries };
  }

  async getDiaryBySession(sessionId: string, userId: string) {
    // 1️⃣ Validate ownership via session
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    // 2️⃣ Fetch diary using PK (sessionId)
    const diary = await this.prisma.diary.findUnique({
      where: { sessionId },
    });

    if (!diary) {
      return { diary: null, date: null };
    }

    return {
      diary: diary.content,
      date: diary.createdAt,
    };
  }
}

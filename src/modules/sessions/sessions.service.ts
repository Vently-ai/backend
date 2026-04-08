import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { MicroclientService } from '../microclient/microclient.service.js';
import { SessionStatus, Role } from '../../../generated/prisma/client.js';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private microclient: MicroclientService,
  ) {}

  async createSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const states = (user.states as any) || {};
    const session = await this.prisma.session.create({
      data: {
        userId,
        status: SessionStatus.ACTIVE,
      },
    });

    const aiResponse = await this.microclient.createSession(session.id, user.nickname, {
      background: states.background,
      current_state: states.current_state,
      previous_session_summary: states.previous_session_summary,
      pastweek_summary: states.pastweek_summary,
    });

    // console.log(aiResponse);

    const firstQuestion = aiResponse.content;

    await this.prisma.message.create({
      data: {
        sessionId: session.id,
        role: Role.ASSISTANT,
        content: firstQuestion,
      },
    });

    return {
      session_id: session.id,
      question: firstQuestion,
    };
  }

  async getSessions(userId: string, mode: string) {
    const where: any = { userId };
    if (mode === '1') {
      where.status = SessionStatus.ACTIVE;
    }

    const sessions = await this.prisma.session.findMany({
      where,
      orderBy: { startAt: 'desc' },
    });

    return {
      sessions: sessions.map((s) => ({
        session_id: s.id,
        status: s.status.toLowerCase(),
        start_timestamp: s.startAt.toISOString(),
      })),
    };
  }

  async sendMessage(sessionId: string, userId: string, message: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    // Save user message
    await this.prisma.message.create({
      data: {
        sessionId,
        role: Role.USER,
        content: message,
      },
    });

    // Call microservice
    const response = await this.microclient.sendMessage(sessionId, message);

    // Save assistant message
    await this.prisma.message.create({
      data: {
        sessionId,
        role: Role.ASSISTANT,
        content: response.content,
      },
    });

    // Handle diary if presented
    if (response.diary) {
      await this.prisma.diary.upsert({
        where: { sessionId },
        update: {
          content: response.diary,
        },
        create: {
          sessionId,
          userId,
          content: response.diary,
        },
      });

      // Update session status
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.COMPLETED },
      });
    }

    return {
      response: response.content,
      diary: response.diary,
    };
  }

  async getMessages(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    return {
      messages: messages.map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    };
  }

  async updateUserState(sessionId: string, userId: string, data: any) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found or unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentStates = (user.states as any) || {};
    const updatedStates = {
      ...currentStates,
      ...data,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        states: updatedStates,
      },
    });

    return { status: 'ok' };
  }
}

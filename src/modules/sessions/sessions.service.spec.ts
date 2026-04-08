import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { MicroclientService } from '../microclient/microclient.service.js';
import { SessionStatus, Role } from '../../../generated/prisma/client.js';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: PrismaService;
  let microclient: MicroclientService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    diary: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockMicroclientService = {
    createSession: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MicroclientService, useValue: mockMicroclientService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
    microclient = module.get<MicroclientService>(MicroclientService);
  });

  describe('createSession', () => {
    it('should create session and assistant message', async () => {
      const user = { id: 'u1', nickname: 'nick', states: { background: 'bg' } };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.session.create.mockResolvedValue({ id: 's1' });
      mockMicroclientService.createSession.mockResolvedValue({ content: 'first question' });

      const result = await service.createSession('u1');

      expect(result).toEqual({ session_id: 's1', question: 'first question' });
      expect(prisma.session.create).toHaveBeenCalled();
      expect(prisma.message.create).toHaveBeenCalled();
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const now = new Date();
      mockPrismaService.session.findMany.mockResolvedValue([
        { id: 's1', status: SessionStatus.ACTIVE, startAt: now },
      ]);

      const result = await service.getSessions('u1', '0');

      expect(result.sessions[0].session_id).toBe('s1');
      expect(result.sessions[0].status).toBe('active');
    });
  });

  describe('sendMessage', () => {
    it('should handle user and assistant messages and diary generation', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      mockMicroclientService.sendMessage.mockResolvedValue({ content: 'reply', diary: 'diary content' });
      mockPrismaService.diary.upsert.mockResolvedValue({});
      mockPrismaService.session.update.mockResolvedValue({});

      const result = await service.sendMessage('s1', 'u1', 'hi');

      expect(result).toEqual({ response: 'reply', diary: 'diary content' });
      expect(prisma.message.create).toHaveBeenCalledTimes(2);
      expect(prisma.diary.upsert).toHaveBeenCalled();
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: SessionStatus.COMPLETED },
      });
    });

    it('should throw UnauthorizedException if session not found or unauthorized', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage('s1', 'u1', 'hi')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMessages', () => {
    it('should return session messages', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      const now = new Date();
      mockPrismaService.message.findMany.mockResolvedValue([
        { role: Role.USER, content: 'hi', timestamp: now },
      ]);

      const result = await service.getMessages('s1', 'u1');

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toBe('hi');
    });
  });

  describe('updateUserState', () => {
    it('should merge and update user states', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', states: { old: 'state' } });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateUserState('s1', 'u1', { new: 'state' });

      expect(result).toEqual({ status: 'ok' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { states: { old: 'state', new: 'state' } },
      });
    });
  });
});

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DiaryService } from './diary.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('DiaryService', () => {
  let service: DiaryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
    },
    diary: {
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiaryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DiaryService>(DiaryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createSummary', () => {
    it('should throw UnauthorizedException if session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);
      await expect(service.createSummary('s1', 'u1', 'content')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session belongs to another user', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u2' });
      await expect(service.createSummary('s1', 'u1', 'content')).rejects.toThrow(UnauthorizedException);
    });

    it('should update diary if authorized', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      mockPrismaService.diary.update.mockResolvedValue({});
      const result = await service.createSummary('s1', 'u1', 'content');
      expect(result).toEqual({ status: 'ok' });
      expect(prisma.diary.update).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
        data: { summarizedContent: 'content' },
      });
    });
  });

  describe('getSummarizedDiary', () => {
    it('should return padded summaries', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      mockPrismaService.diary.findMany.mockResolvedValue([
        { summarizedContent: 'sum1' },
      ]);

      const result = await service.getSummarizedDiary('s1', 'u1', 3, 0);
      expect(result.summarized_entries).toEqual(['sum1', null, null]);
    });

    it('should skip entries based on sf', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      mockPrismaService.diary.findMany.mockResolvedValue([
        { summarizedContent: 'sum1' },
        { summarizedContent: 'sum2' },
      ]);

      const result = await service.getSummarizedDiary('s1', 'u1', 2, 1);
      expect(result.summarized_entries).toEqual(['sum2']);
    });
  });

  describe('getDiaryBySession', () => {
    it('should return diary content and date', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      const now = new Date();
      mockPrismaService.diary.findUnique.mockResolvedValue({
        content: 'hello',
        createdAt: now,
      });

      const result = await service.getDiaryBySession('s1', 'u1');
      expect(result).toEqual({ diary: 'hello', date: now });
      expect(prisma.diary.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
      });
    });
  });
});

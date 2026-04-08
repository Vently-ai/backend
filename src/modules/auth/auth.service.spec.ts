import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthType } from '../../../generated/prisma/client.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    auth: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create user and auth entries and return tokens', async () => {
      const dto = { username: 'testuser', nickname: 'Test Nick', password: 'password123' };
      const user = { id: 'user1', username: dto.username, nickname: dto.nickname };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };

      mockPrismaService.user.create.mockResolvedValue(user);
      mockPrismaService.auth.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValueOnce(tokens.accessToken).mockReturnValueOnce(tokens.refreshToken);

      const result = await service.signup(dto);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.auth.create).toHaveBeenCalledTimes(2); // PASSWORD and JWT
      expect(result).toEqual({ user, ...tokens });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ username: 'nonexistent', password: 'pw' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password auth not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user1',
        auths: [],
      });

      await expect(service.login({ username: 'user1', password: 'pw' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user1',
        auths: [{ type: AuthType.PASSWORD, password: hashedPassword }],
      });

      await expect(service.login({ username: 'user1', password: 'wrong_password' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens and user and update JWT auth if successful', async () => {
      const password = 'correct_password';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: 'user1',
        username: 'user1',
        nickname: 'nick',
        auths: [{ type: AuthType.PASSWORD, password: hashedPassword }],
      };
      const tokens = { accessToken: 'at', refreshToken: 'rt' };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValueOnce(tokens.accessToken).mockReturnValueOnce(tokens.refreshToken);
      mockPrismaService.auth.upsert.mockResolvedValue({});

      const result = await service.login({ username: 'user1', password });

      const { auths, ...userWithoutAuths } = user;
      expect(result).toEqual({ user: userWithoutAuths, ...tokens });
      expect(prisma.auth.upsert).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if jwt verify fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(service.refresh('invalidtoken')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token not in db', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user1' });
      mockPrismaService.auth.findUnique.mockResolvedValue(null);

      await expect(service.refresh('validtoken')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match db', async () => {
      const rt = 'token123';
      const hashedRT = await bcrypt.hash('different_token', 10);
      mockJwtService.verify.mockReturnValue({ sub: 'user1' });
      mockPrismaService.auth.findUnique.mockResolvedValue({ password: hashedRT });

      await expect(service.refresh(rt)).rejects.toThrow(UnauthorizedException);
    });

    it('should return new access token if refresh token valid', async () => {
      const rt = 'token123';
      const hashedRT = await bcrypt.hash(rt, 10);
      mockJwtService.verify.mockReturnValue({ sub: 'user1' });
      mockPrismaService.auth.findUnique.mockResolvedValue({ password: hashedRT });
      mockJwtService.sign.mockReturnValue('newAT');

      const result = await service.refresh(rt);

      expect(result).toEqual({ accessToken: 'newAT' });
    });
  });

  describe('logout', () => {
    it('should set JWT password to null', async () => {
      mockPrismaService.auth.update.mockResolvedValue({});

      const result = await service.logout('user1');

      expect(prisma.auth.update).toHaveBeenCalledWith({
        where: { userId_type: { userId: 'user1', type: AuthType.JWT } },
        data: { password: null },
      });
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});

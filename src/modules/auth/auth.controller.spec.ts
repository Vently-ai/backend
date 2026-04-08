import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    signup: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /auth/login', async () => {
    const dto = { username: 'test', password: 'pw' };
    const tokens = { accessToken: 'at', refreshToken: 'rt' };
    const user = { id: '1', username: 'test' };
    const response = { user, ...tokens };
    mockAuthService.login.mockResolvedValue(response);

    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(response);
  });

  it('POST /auth/signup', async () => {
    const dto = { username: 'test', nickname: 'nick', password: 'pw' };
    const response = { user: { id: '1' }, accessToken: 'at', refreshToken: 'rt' };
    mockAuthService.signup.mockResolvedValue(response);

    const result = await controller.signup(dto);

    expect(service.signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual(response);
  });

  it('POST /auth/refresh', async () => {
    const body = { refreshToken: 'rt' };
    const result_at = { accessToken: 'newAT' };
    mockAuthService.refresh.mockResolvedValue(result_at);

    const result = await controller.refresh(body);

    expect(service.refresh).toHaveBeenCalledWith(body.refreshToken);
    expect(result).toEqual(result_at);
  });

  it('POST /auth/logout', async () => {
    const req = { user: { sub: 'user1' } };
    mockAuthService.logout.mockResolvedValue({ message: 'Logged out' });

    const result = await controller.logout(req);

    expect(service.logout).toHaveBeenCalledWith('user1');
    expect(result).toEqual({ message: 'Logged out' });
  });

  it('GET /auth/validate', async () => {
    const req = { user: { sub: 'user1' } };
    const result = await controller.validate(req);

    expect(result).toEqual({ valid: true, userId: 'user1' });
  });
});

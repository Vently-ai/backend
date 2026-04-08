import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroclientService } from './microclient.service.js';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

describe('MicroclientService', () => {
  let service: MicroclientService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicroclientService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<MicroclientService>(MicroclientService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should call post and return data', async () => {
      const response: AxiosResponse = {
        data: { content: 'hello' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
      };

      mockHttpService.post.mockReturnValue(of(response));

      const result = await service.createSession('s1', 'nick', { background: 'bg' });

      expect(result).toEqual({ content: 'hello' });
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw error if post fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('API Error')));

      await expect(service.createSession('s1', 'nick', {})).rejects.toThrow('API Error');
    });
  });

  describe('sendMessage', () => {
    it('should call post and return data', async () => {
      const response: AxiosResponse = {
        data: { content: 'reply', diary: null },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
      };

      mockHttpService.post.mockReturnValue(of(response));

      const result = await service.sendMessage('s1', 'hi');

      expect(result).toEqual({ content: 'reply', diary: null });
      expect(httpService.post).toHaveBeenCalled();
    });
  });
});

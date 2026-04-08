import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface UserStates {
  background: string;
  current_state: string;
  previous_session_summary: string;
  pastweek_summary: string;
}

@Injectable()
export class MicroclientService {
  private readonly logger = new Logger(MicroclientService.name);
  private readonly baseUrl = process.env.MICROSERVICE_URL || 'http://localhost:8989';

  constructor(private readonly httpService: HttpService) {}

  async createSession(sessionId: string, nickname: string, params: Partial<UserStates>) {
    const url = `${this.baseUrl}/sessions`;
    const payload = {
      session_id: sessionId,
      nickname,
      background: params.background,
      current_state: params.current_state,
      previous_session_summary: params.previous_session_summary,
      pastweek_summary: params.pastweek_summary,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { timeout: 50000 }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error calling microservice create_session: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string) {
    const url = `${this.baseUrl}/sessions/${sessionId}/messages`;
    const payload = { content: message };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { timeout: 50000 }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error calling microservice send_message: ${error.message}`);
      throw error;
    }
  }
}

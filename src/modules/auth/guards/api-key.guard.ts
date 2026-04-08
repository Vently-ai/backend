import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API Key missing or invalid format');
    }

    const apiKey = authHeader.split(' ')[1];
    if (apiKey !== process.env.API_KEY) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Since these routes are sessionId-scoped, we resolve the userId from sessionId
    // to keep the services compatible (they expect req.user.sub)
    const sessionId = request.params.sessionId;
    // console.log(sessionId);
    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true },
      });

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      request.user = { sub: session.userId };
    }

    return true;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuthType } from '../../../generated/prisma/client.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async signTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '60m' });
    const refreshToken = this.jwtService.sign({ sub: userId }, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        nickname: dto.nickname,
      },
    });

    await this.prisma.auth.create({
      data: {
        userId: user.id,
        type: AuthType.PASSWORD,
        password: hashedPassword,
      },
    });

    const tokens = await this.signTokens(user.id);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.auth.create({
      data: {
        userId: user.id,
        type: AuthType.JWT,
        password: hashedRefresh,
      },
    });

    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        auths: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordAuth = user.auths.find((a) => a.type === AuthType.PASSWORD);
    if (!passwordAuth || !passwordAuth.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, passwordAuth.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.signTokens(user.id);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.auth.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: AuthType.JWT,
        },
      },
      update: {
        password: hashedRefresh,
      },
      create: {
        userId: user.id,
        type: AuthType.JWT,
        password: hashedRefresh,
      },
    });

    const { auths, ...userWithoutAuths } = user;
    return { user: userWithoutAuths, ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;

    const auth = await this.prisma.auth.findUnique({
      where: {
        userId_type: {
          userId,
          type: AuthType.JWT,
        },
      },
    });

    if (!auth || !auth.password) {
      throw new UnauthorizedException('No refresh token found');
    }

    const isValid = await bcrypt.compare(refreshToken, auth.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newAccessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '15m' });

    return { accessToken: newAccessToken };
  }

  async logout(userId: string) {
    await this.prisma.auth.update({
      where: {
        userId_type: {
          userId,
          type: AuthType.JWT,
        },
      },
      data: {
        password: null,
      },
    });

    return { message: 'Logged out' };
  }
}

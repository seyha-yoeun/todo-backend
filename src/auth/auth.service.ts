import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';
import { QueryFailedError, Repository } from 'typeorm';
import { AuthResponseDto, AuthUserResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import { User } from './entities/user.entity';

import { Role } from './enums/role.enum';

const BCRYPT_ROUNDS = 12;
const POSTGRES_UNIQUE_VIOLATION = '23505';
const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists.';

interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: SignOptions['expiresIn'];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = (configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '30d') as SignOptions['expiresIn'];
  }

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const firstName = signupDto.firstName.trim();
    const lastName = signupDto.lastName.trim();
    if (firstName === '' || lastName === '') {
      throw new BadRequestException('First name and last name are required.');
    }

    const email = this.normalizeEmail(signupDto.email);
    if (await this.userRepository.existsBy({ email })) {
      throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
    }

    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      role: signupDto.role ?? Role.USER,
      passwordHash: await bcrypt.hash(signupDto.password, BCRYPT_ROUNDS),
    });

    let saved: User;
    try {
      saved = await this.userRepository.save(user);
    } catch (error) {
      // A concurrent signup can pass the check above; the unique index is the
      // final authority, so translate its violation into the same 409.
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
      }
      throw error;
    }

    return this.issueTokens(saved);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', {
        email: this.normalizeEmail(loginDto.email),
      })
      .getOne();

    if (
      user === null ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueTokens(user);
  }

  /** Exchanges a valid, stored refresh token for a new access/refresh pair. */
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: payload.sub })
      .getOne();

    if (
      user === null ||
      user.refreshTokenHash === null ||
      !this.tokenMatches(refreshTokenDto.refreshToken, user.refreshTokenHash)
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Rotate both tokens so a replayed refresh token stops working.
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        ...payload,
        type: 'access',
        jti: randomUUID(),
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh', jti: randomUUID() },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn,
        },
      ),
    ]);

    user.accessTokenHash = this.hashToken(accessToken);
    user.refreshTokenHash = this.hashToken(refreshToken);
    const saved = await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: this.toUserResponse(saved),
    };
  }

  private async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(
        token,
        {
          secret: this.refreshSecret,
        },
      );
      if (payload.type !== 'refresh' || typeof payload.sub !== 'string') {
        throw new Error('Not a refresh token.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  toUserResponse(user: User): AuthUserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role ?? Role.USER,
      createdAt: new Date(user.createdAt).getTime(),
      updatedAt: new Date(user.updatedAt).getTime(),
    };
  }

  /** Admin endpoint: list all users */
  async findAllUsers(): Promise<AuthUserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.toUserResponse(u));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private tokenMatches(token: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashToken(token), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code ===
        POSTGRES_UNIQUE_VIOLATION
    );
  }
}

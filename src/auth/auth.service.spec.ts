import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-01-02T00:00:00.000Z');

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: USER_ID,
    firstName: 'Seyha',
    lastName: 'Yoeun',
    email: 'you@example.com',
    role: Role.USER,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let userRepository: {
    existsBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    userRepository = {
      existsBy: jest.fn().mockResolvedValue(false),
      create: jest.fn((data: Partial<User>) => Object.assign(new User(), data)),
      save: jest.fn((user: User) =>
        Promise.resolve(
          Object.assign(user, {
            id: user.id ?? USER_ID,
            createdAt: user.createdAt ?? CREATED_AT,
            updatedAt: user.updatedAt ?? UPDATED_AT,
          }),
        ),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: ACCESS_SECRET,
            signOptions: { expiresIn: '15m' },
          }),
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
              throw new Error(`Unexpected config key ${key}`);
            }),
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  it('throws at construction when JWT_REFRESH_SECRET is missing', () => {
    const config = {
      getOrThrow: jest.fn(() => {
        throw new Error('missing');
      }),
      get: jest.fn(),
    } as unknown as ConfigService;

    expect(
      () => new AuthService(userRepository as never, jwtService, config),
    ).toThrow('missing');
  });

  describe('signup', () => {
    const dto = {
      firstName: '  Seyha ',
      lastName: ' Yoeun ',
      email: ' YOU@Example.com ',
      password: 'password123',
    };

    it('creates a user with trimmed names, normalized email and hashed password', async () => {
      const result = await service.signup(dto);

      expect(userRepository.existsBy).toHaveBeenCalledWith({
        email: 'you@example.com',
      });
      const created = userRepository.create.mock.calls[0][0] as Partial<User>;
      expect(created).toMatchObject({
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        role: Role.USER,
      });
      expect(created.passwordHash).not.toBe('password123');
      await expect(
        bcrypt.compare('password123', created.passwordHash!),
      ).resolves.toBe(true);

      expect(result.user).toEqual({
        id: USER_ID,
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        role: Role.USER,
        createdAt: CREATED_AT.getTime(),
        updatedAt: UPDATED_AT.getTime(),
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('issues a valid access/refresh token pair and stores their hashes', async () => {
      const result = await service.signup(dto);

      const access = await jwtService.verifyAsync(result.accessToken, {
        secret: ACCESS_SECRET,
      });
      const refresh = await jwtService.verifyAsync(result.refreshToken, {
        secret: REFRESH_SECRET,
      });
      expect(access).toMatchObject({
        sub: USER_ID,
        email: 'you@example.com',
        role: Role.USER,
        type: 'access',
      });
      expect(refresh).toMatchObject({ sub: USER_ID, type: 'refresh' });

      const lastSaved = userRepository.save.mock.calls.at(-1)![0] as User;
      expect(lastSaved.accessTokenHash).toBe(sha256(result.accessToken));
      expect(lastSaved.refreshTokenHash).toBe(sha256(result.refreshToken));
    });

    it('keeps the requested role when one is provided', async () => {
      await service.signup({ ...dto, role: Role.ADMIN });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });

    it('rejects names that are blank after trimming', async () => {
      await expect(
        service.signup({ ...dto, firstName: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userRepository.existsBy).not.toHaveBeenCalled();
    });

    it('rejects an already registered email', async () => {
      userRepository.existsBy.mockResolvedValue(true);

      await expect(service.signup(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('translates a unique-index violation from a concurrent signup into 409', async () => {
      const error = new QueryFailedError('INSERT', [], {
        code: '23505',
      } as unknown as Error);
      userRepository.save.mockRejectedValueOnce(error);

      await expect(service.signup(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows other database errors unchanged', async () => {
      const error = new Error('connection lost');
      userRepository.save.mockRejectedValueOnce(error);

      await expect(service.signup(dto)).rejects.toBe(error);
    });
  });

  describe('login', () => {
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await bcrypt.hash('password123', 4);
    });

    it('returns tokens for valid credentials, matching email case-insensitively', async () => {
      queryBuilder.getOne.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login({
        email: '  YOU@example.com ',
        password: 'password123',
      });

      expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.passwordHash');
      expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'you@example.com',
      });
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user.email).toBe('you@example.com');
    });

    it('rejects an unknown email', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      queryBuilder.getOne.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'you@example.com', password: 'wrong-pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    async function issueRefreshToken(): Promise<string> {
      const { refreshToken } = await service.signup({
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        password: 'password123',
      });
      userRepository.save.mockClear();
      return refreshToken;
    }

    it('rotates both tokens for a valid stored refresh token', async () => {
      const refreshToken = await issueRefreshToken();
      queryBuilder.getOne.mockResolvedValue(
        makeUser({ refreshTokenHash: sha256(refreshToken) }),
      );

      const result = await service.refresh({ refreshToken });

      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :id', {
        id: USER_ID,
      });
      expect(result.refreshToken).not.toBe(refreshToken);
      const saved = userRepository.save.mock.calls[0][0] as User;
      expect(saved.refreshTokenHash).toBe(sha256(result.refreshToken));
    });

    it('rejects a malformed token', async () => {
      await expect(
        service.refresh({ refreshToken: 'not-a-jwt' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an access token used as a refresh token', async () => {
      const accessLike = await jwtService.signAsync(
        { sub: USER_ID, type: 'access' },
        { secret: REFRESH_SECRET },
      );

      await expect(
        service.refresh({ refreshToken: accessLike }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token signed with the access secret', async () => {
      const wrongSecret = await jwtService.signAsync({
        sub: USER_ID,
        type: 'refresh',
      });

      await expect(
        service.refresh({ refreshToken: wrongSecret }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it.each([
      ['the user no longer exists', () => null],
      ['the session was revoked', () => makeUser({ refreshTokenHash: null })],
      [
        'a newer refresh token replaced it',
        () => makeUser({ refreshTokenHash: sha256('another-token') }),
      ],
    ])('rejects when %s', async (_label, stored) => {
      const refreshToken = await issueRefreshToken();
      queryBuilder.getOne.mockResolvedValue(stored());

      await expect(service.refresh({ refreshToken })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears both stored token hashes for a valid session', async () => {
      const { refreshToken } = await service.signup({
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        password: 'password123',
      });
      queryBuilder.getOne.mockResolvedValue(
        makeUser({ refreshTokenHash: sha256(refreshToken) }),
      );

      await service.logout({ refreshToken });

      expect(userRepository.update).toHaveBeenCalledWith(USER_ID, {
        accessTokenHash: null,
        refreshTokenHash: null,
      });
    });

    it('silently ignores an invalid token', async () => {
      await expect(
        service.logout({ refreshToken: 'garbage' }),
      ).resolves.toBeUndefined();
      expect(userRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('silently ignores a token that is no longer the current one', async () => {
      const { refreshToken } = await service.signup({
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        password: 'password123',
      });
      queryBuilder.getOne.mockResolvedValue(
        makeUser({ refreshTokenHash: null }),
      );

      await expect(service.logout({ refreshToken })).resolves.toBeUndefined();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('findUserForAccessToken', () => {
    const token = 'header.payload.signature';

    it('returns the user without the hash when the token is current', async () => {
      queryBuilder.getOne.mockResolvedValue(
        makeUser({ accessTokenHash: sha256(token) }),
      );

      const user = await service.findUserForAccessToken(USER_ID, token);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(USER_ID);
      expect(user).not.toHaveProperty('accessTokenHash');
    });

    it.each([
      ['no user', null],
      ['a revoked session', makeUser({ accessTokenHash: null })],
      ['a different token', makeUser({ accessTokenHash: sha256('other') })],
      ['a malformed stored hash', makeUser({ accessTokenHash: 'abc' })],
    ])('returns null for %s', async (_label, stored) => {
      queryBuilder.getOne.mockResolvedValue(stored);

      await expect(
        service.findUserForAccessToken(USER_ID, token),
      ).resolves.toBeNull();
    });
  });

  describe('findUserById', () => {
    it('delegates to the repository', async () => {
      const user = makeUser();
      userRepository.findOneBy.mockResolvedValue(user);

      await expect(service.findUserById(USER_ID)).resolves.toBe(user);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: USER_ID });
    });
  });

  describe('findAllUsers', () => {
    it('returns every user, newest first, in the public shape', async () => {
      userRepository.find.mockResolvedValue([
        makeUser(),
        makeUser({ id: 'u2', email: 'admin@example.com', role: Role.ADMIN }),
      ]);

      const result = await service.findAllUsers();

      expect(userRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result.map((u) => [u.id, u.role])).toEqual([
        [USER_ID, Role.USER],
        ['u2', Role.ADMIN],
      ]);
    });
  });

  describe('toUserResponse', () => {
    it('converts dates to epoch ms and defaults a missing role to USER', () => {
      const user = makeUser({ role: undefined as unknown as Role });

      expect(service.toUserResponse(user)).toEqual({
        id: USER_ID,
        firstName: 'Seyha',
        lastName: 'Yoeun',
        email: 'you@example.com',
        role: Role.USER,
        createdAt: CREATED_AT.getTime(),
        updatedAt: UPDATED_AT.getTime(),
      });
    });
  });
});

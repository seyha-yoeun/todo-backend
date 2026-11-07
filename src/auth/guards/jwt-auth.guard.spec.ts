import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

const SECRET = 'test-access-secret';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({ secret: SECRET });
  const user = { id: 'u1', email: 'you@example.com' } as User;
  let authService: { findUserForAccessToken: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    authService = { findUserForAccessToken: jest.fn().mockResolvedValue(user) };
    const config = {
      getOrThrow: jest.fn().mockReturnValue(SECRET),
    } as unknown as ConfigService;
    guard = new JwtAuthGuard(
      jwtService,
      config,
      authService as unknown as AuthService,
    );
  });

  const sign = (payload: object, secret = SECRET): Promise<string> =>
    jwtService.signAsync(payload, { secret });

  it('attaches the user to the request for a valid, current access token', async () => {
    const token = await sign({ sub: 'u1', email: 'you@example.com', type: 'access' });
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(authService.findUserForAccessToken).toHaveBeenCalledWith('u1', token);
    expect(request.user).toBe(user);
  });

  async function expectRejected(
    authorization: unknown,
    message: string | RegExp,
  ): Promise<void> {
    const request = { headers: { authorization } };
    const result = guard.canActivate(contextFor(request));
    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toThrow(message);
  }

  it('rejects a missing Authorization header', async () => {
    await expectRejected(undefined, 'Authorization header is missing.');
  });

  it.each(['Basic abc', 'Bearer', 'bearer token'])(
    'rejects a malformed header "%s"',
    async (header) => {
      await expectRejected(header, /Expected Bearer token/);
    },
  );

  it('rejects an invalid signature', async () => {
    const token = await sign({ sub: 'u1', type: 'access' }, 'other-secret');
    await expectRejected(`Bearer ${token}`, 'Invalid or expired token.');
  });

  it('rejects an expired token', async () => {
    const token = await jwtService.signAsync(
      { sub: 'u1', type: 'access' },
      { secret: SECRET, expiresIn: -10 },
    );
    await expectRejected(`Bearer ${token}`, 'Invalid or expired token.');
  });

  it('rejects a refresh token', async () => {
    const token = await sign({ sub: 'u1', type: 'refresh' });
    await expectRejected(`Bearer ${token}`, 'Invalid token type.');
  });

  it('rejects a token without a subject', async () => {
    const token = await sign({ type: 'access' });
    await expectRejected(`Bearer ${token}`, 'Invalid token type.');
  });

  it('rejects a revoked or superseded session', async () => {
    authService.findUserForAccessToken.mockResolvedValue(null);
    const token = await sign({ sub: 'u1', type: 'access' });
    await expectRejected(
      `Bearer ${token}`,
      'Session has expired or was revoked.',
    );
  });

  it('maps unexpected lookup errors to 401', async () => {
    authService.findUserForAccessToken.mockRejectedValue(new Error('db down'));
    const token = await sign({ sub: 'u1', type: 'access' });
    await expectRejected(`Bearer ${token}`, 'Invalid or expired token.');
  });
});

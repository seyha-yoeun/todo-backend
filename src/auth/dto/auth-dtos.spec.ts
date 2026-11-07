import { validateDto } from '../../test-utils/validate-dto';
import { Role } from '../enums/role.enum';
import { LoginDto } from './login.dto';
import { RefreshTokenDto } from './refresh-token.dto';
import { SignupDto } from './signup.dto';

describe('SignupDto', () => {
  const valid = {
    firstName: 'Seyha',
    lastName: 'Yoeun',
    email: 'you@example.com',
    password: 'password123',
  };

  it('accepts a valid body and trims strings', async () => {
    const { dto, errors } = await validateDto(SignupDto, {
      ...valid,
      firstName: '  Seyha  ',
      email: '  you@example.com ',
    });

    expect(errors).toEqual([]);
    expect(dto.firstName).toBe('Seyha');
    expect(dto.email).toBe('you@example.com');
  });

  it.each([
    ['firstName', { firstName: '   ' }],
    ['lastName', { lastName: 'x'.repeat(51) }],
    ['email', { email: 'not-an-email' }],
    ['password', { password: 'short' }],
    ['password', { password: 'x'.repeat(73) }],
    ['role', { role: 'superuser' }],
  ])('rejects an invalid %s', async (field, patch) => {
    const { errors } = await validateDto(SignupDto, { ...valid, ...patch });
    expect(errors).toContain(field);
  });

  it('accepts a known role', async () => {
    const { errors } = await validateDto(SignupDto, {
      ...valid,
      role: Role.ADMIN,
    });
    expect(errors).toEqual([]);
  });

  it('rejects unknown properties', async () => {
    const { errors } = await validateDto(SignupDto, { ...valid, isAdmin: true });
    expect(errors).toEqual(['isAdmin']);
  });
});

describe('LoginDto', () => {
  it('accepts a valid body', async () => {
    const { errors } = await validateDto(LoginDto, {
      email: ' you@example.com ',
      password: 'anything',
    });
    expect(errors).toEqual([]);
  });

  it('rejects a missing password and a bad email', async () => {
    const { errors } = await validateDto(LoginDto, { email: 'nope' });
    expect(errors.sort()).toEqual(['email', 'password']);
  });
});

describe('RefreshTokenDto', () => {
  it('accepts a token string', async () => {
    const { errors } = await validateDto(RefreshTokenDto, {
      refreshToken: 'a.b.c',
    });
    expect(errors).toEqual([]);
  });

  it.each([[''], ['x'.repeat(2049)], [123]])(
    'rejects %p',
    async (refreshToken) => {
      const { errors } = await validateDto(RefreshTokenDto, { refreshToken });
      expect(errors).toEqual(['refreshToken']);
    },
  );
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ROLES_KEY } from './decorators/roles.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

const authResponse: AuthResponseDto = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: {
    id: 'u1',
    firstName: 'Seyha',
    lastName: 'Yoeun',
    email: 'you@example.com',
    role: Role.USER,
    createdAt: 0,
    updatedAt: 0,
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signup: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    toUserResponse: jest.Mock;
    findAllUsers: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      signup: jest.fn().mockResolvedValue(authResponse),
      login: jest.fn().mockResolvedValue(authResponse),
      refresh: jest.fn().mockResolvedValue(authResponse),
      logout: jest.fn().mockResolvedValue(undefined),
      toUserResponse: jest.fn().mockReturnValue(authResponse.user),
      findAllUsers: jest.fn().mockResolvedValue([authResponse.user]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('signup delegates to AuthService.signup', async () => {
    const dto = {
      firstName: 'Seyha',
      lastName: 'Yoeun',
      email: 'you@example.com',
      password: 'password123',
    };

    await expect(controller.signup(dto)).resolves.toBe(authResponse);
    expect(authService.signup).toHaveBeenCalledWith(dto);
  });

  it('login delegates to AuthService.login', async () => {
    const dto = { email: 'you@example.com', password: 'password123' };

    await expect(controller.login(dto)).resolves.toBe(authResponse);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('refresh delegates to AuthService.refresh', async () => {
    const dto = { refreshToken: 'refresh' };

    await expect(controller.refresh(dto)).resolves.toBe(authResponse);
    expect(authService.refresh).toHaveBeenCalledWith(dto);
  });

  it('logout delegates to AuthService.logout', async () => {
    const dto = { refreshToken: 'refresh' };

    await expect(controller.logout(dto)).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledWith(dto);
  });

  it('me returns the public shape of the current user', () => {
    const user = { id: 'u1' } as User;

    expect(controller.me(user)).toBe(authResponse.user);
    expect(authService.toUserResponse).toHaveBeenCalledWith(user);
  });

  it('findAllUsers delegates to AuthService.findAllUsers', async () => {
    await expect(controller.findAllUsers()).resolves.toEqual([
      authResponse.user,
    ]);
  });

  describe('route protection', () => {
    const guardsOf = (handler: unknown): unknown[] =>
      Reflect.getMetadata('__guards__', handler as object) ?? [];
    const rolesOf = (handler: unknown): Role[] | undefined =>
      Reflect.getMetadata(ROLES_KEY, handler as object);

    it.each(['signup', 'login', 'refresh', 'logout'] as const)(
      '%s is public',
      (name) => {
        expect(guardsOf(AuthController.prototype[name])).toEqual([]);
      },
    );

    it('me requires authentication for users and admins', () => {
      const handler = AuthController.prototype.me;
      expect(guardsOf(handler)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(rolesOf(handler)).toEqual([Role.USER, Role.ADMIN]);
    });

    it('users is restricted to admins', () => {
      const handler = AuthController.prototype.findAllUsers;
      expect(guardsOf(handler)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(rolesOf(handler)).toEqual([Role.ADMIN]);
    });
  });
});

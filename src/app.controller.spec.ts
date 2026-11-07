import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { ROLES_KEY } from './auth/decorators/roles.decorator';
import { User } from './auth/entities/user.entity';
import { Role } from './auth/enums/role.enum';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

describe('AppController', () => {
  let appController: AppController;
  let authService: { toUserResponse: jest.Mock };

  beforeEach(async () => {
    authService = { toUserResponse: jest.fn().mockReturnValue({ id: 'u1' }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = module.get(AppController);
  });

  it('getHello returns "Hello World!"', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });

  it('getMe returns the public shape of the current user', () => {
    const user = { id: 'u1' } as User;

    expect(appController.getMe(user)).toEqual({ id: 'u1' });
    expect(authService.toUserResponse).toHaveBeenCalledWith(user);
  });

  it('getMe requires authentication for users and admins', () => {
    const handler = AppController.prototype.getMe;
    expect(Reflect.getMetadata('__guards__', handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });
});

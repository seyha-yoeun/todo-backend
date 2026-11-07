import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AvatarColor } from './entities/profile.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  const user = { id: 'u1' } as User;
  const response = {
    name: 'Seyha Yoeun',
    email: 'you@example.com',
    avatarColor: AvatarColor.INDIGO,
  };
  let controller: ProfileController;
  let profileService: { find: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    profileService = {
      find: jest.fn().mockResolvedValue(response),
      save: jest.fn().mockResolvedValue(response),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: profileService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ProfileController);
  });

  it('find returns the current user profile', async () => {
    await expect(controller.find(user)).resolves.toBe(response);
    expect(profileService.find).toHaveBeenCalledWith(user);
  });

  it('save passes the user and body to the service', async () => {
    const dto = { name: 'Seyha Yoeun' };

    await expect(controller.save(user, dto)).resolves.toBe(response);
    expect(profileService.save).toHaveBeenCalledWith(user, dto);
  });

  it('is protected for users and admins at the controller level', () => {
    expect(Reflect.getMetadata('__guards__', ProfileController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ProfileController)).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });
});

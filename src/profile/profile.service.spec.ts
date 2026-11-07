import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { AvatarColor, Profile } from './entities/profile.entity';
import { ProfileService } from './profile.service';

const user = {
  id: 'u1',
  firstName: 'Seyha',
  lastName: 'Yoeun',
  email: 'you@example.com',
} as User;

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return Object.assign(new Profile(), {
    id: 'p1',
    userId: user.id,
    name: 'Custom Name',
    email: 'custom@example.com',
    avatarColor: AvatarColor.TEAL,
    ...overrides,
  });
}

describe('ProfileService', () => {
  let service: ProfileService;
  let profileRepository: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    merge: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    profileRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<Profile>) =>
        Object.assign(new Profile(), data),
      ),
      // Mirror TypeORM: copy defined fields onto the entity.
      merge: jest.fn((target: Profile, source: Partial<Profile>) =>
        Object.assign(
          target,
          Object.fromEntries(
            Object.entries(source).filter(([, v]) => v !== undefined),
          ),
        ),
      ),
      save: jest.fn((profile: Profile) => Promise.resolve(profile)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(Profile), useValue: profileRepository },
      ],
    }).compile();

    service = module.get(ProfileService);
  });

  describe('find', () => {
    it('returns defaults derived from the user when no profile exists', async () => {
      await expect(service.find(user)).resolves.toEqual({
        name: 'Seyha Yoeun',
        email: 'you@example.com',
        avatarColor: AvatarColor.INDIGO,
      });
      expect(profileRepository.findOneBy).toHaveBeenCalledWith({
        userId: 'u1',
      });
    });

    it('returns the stored profile without internal fields', async () => {
      profileRepository.findOneBy.mockResolvedValue(makeProfile());

      await expect(service.find(user)).resolves.toEqual({
        name: 'Custom Name',
        email: 'custom@example.com',
        avatarColor: AvatarColor.TEAL,
      });
    });
  });

  describe('save', () => {
    it.each([{}, { name: undefined, email: undefined }])(
      'rejects a body with no fields (%p)',
      async (dto) => {
        await expect(service.save(user, dto)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(profileRepository.save).not.toHaveBeenCalled();
      },
    );

    it('creates a profile seeded from the user, then applies the update', async () => {
      const result = await service.save(user, {
        avatarColor: AvatarColor.ROSE,
      });

      expect(profileRepository.create).toHaveBeenCalledWith({
        userId: 'u1',
        name: 'Seyha Yoeun',
        email: 'you@example.com',
        avatarColor: AvatarColor.INDIGO,
      });
      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', avatarColor: AvatarColor.ROSE }),
      );
      expect(result).toEqual({
        name: 'Seyha Yoeun',
        email: 'you@example.com',
        avatarColor: AvatarColor.ROSE,
      });
    });

    it('updates an existing profile in place', async () => {
      const existing = makeProfile();
      profileRepository.findOneBy.mockResolvedValue(existing);

      const result = await service.save(user, { name: 'New Name' });

      expect(profileRepository.create).not.toHaveBeenCalled();
      expect(profileRepository.merge).toHaveBeenCalledWith(existing, {
        name: 'New Name',
      });
      expect(result).toEqual({
        name: 'New Name',
        email: 'custom@example.com',
        avatarColor: AvatarColor.TEAL,
      });
    });

    it('allows clearing the email with an empty string', async () => {
      profileRepository.findOneBy.mockResolvedValue(makeProfile());

      const result = await service.save(user, { email: '' });

      expect(result.email).toBe('');
    });
  });
});

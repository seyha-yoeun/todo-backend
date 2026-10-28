import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarColor, Profile } from './entities/profile.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  /** Returns the profile for the specific user, or user-specific defaults when unset. */
  async find(user: User): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findOneBy({ userId: user.id });
    if (profile === null) {
      return {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatarColor: AvatarColor.INDIGO,
      };
    }
    return this.toResponse(profile);
  }

  /** Creates or updates the user-specific profile. */
  async save(
    user: User,
    updateProfileDto: UpdateProfileDto | CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    const provided = Object.values(updateProfileDto).some(
      (value) => value !== undefined,
    );
    if (!provided) {
      throw new BadRequestException('At least one field must be provided.');
    }

    let profile = await this.profileRepository.findOneBy({ userId: user.id });
    if (!profile) {
      profile = this.profileRepository.create({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatarColor: AvatarColor.INDIGO,
      });
    }

    this.profileRepository.merge(profile, updateProfileDto);
    const saved = await this.profileRepository.save(profile);
    return this.toResponse(saved);
  }

  private toResponse(profile: Profile): ProfileResponseDto {
    return {
      name: profile.name,
      email: profile.email,
      avatarColor: profile.avatarColor,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarColor, Profile } from './entities/profile.entity';

/** Mirrors the frontend `DEFAULT_PROFILE`. */
const DEFAULTS: ProfileResponseDto = {
  name: 'Guest',
  email: '',
  avatarColor: AvatarColor.INDIGO,
};

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  /** Returns the single profile, or frontend defaults when it has never been saved. */
  async find(): Promise<ProfileResponseDto> {
    const profile = await this.findEntity();
    return profile === null ? { ...DEFAULTS } : this.toResponse(profile);
  }

  /** Creates the profile on first save, updates it every time after. */
  async save(
    updateProfileDto: UpdateProfileDto | CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    const provided = Object.values(updateProfileDto).some(
      (value) => value !== undefined,
    );
    if (!provided) {
      throw new BadRequestException('At least one field must be provided.');
    }

    const profile = (await this.findEntity()) ?? this.profileRepository.create();
    this.profileRepository.merge(profile, updateProfileDto);
    const saved = await this.profileRepository.save(profile);
    return this.toResponse(saved);
  }

  private async findEntity(): Promise<Profile | null> {
    const [profile] = await this.profileRepository.find({ take: 1 });
    return profile ?? null;
  }

  private toResponse(profile: Profile): ProfileResponseDto {
    return {
      name: profile.name,
      email: profile.email,
      avatarColor: profile.avatarColor,
    };
  }
}

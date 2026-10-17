import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get the profile (frontend defaults when unset)' })
  @ApiOkResponse({ type: ProfileResponseDto })
  find(): Promise<ProfileResponseDto> {
    return this.profileService.find();
  }

  @Put()
  @ApiOperation({ summary: 'Create or replace the profile fields' })
  @ApiOkResponse({ type: ProfileResponseDto })
  save(@Body() updateProfileDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.profileService.save(updateProfileDto);
  }
}

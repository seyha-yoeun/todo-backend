import { ApiProperty } from '@nestjs/swagger';
import { AvatarColor } from '../entities/profile.entity';

/** Public shape returned by the profile endpoints (matches frontend `UserProfile`). */
export class ProfileResponseDto {
  @ApiProperty({ example: 'Seyha Yoeun' })
  name: string;

  @ApiProperty({ example: 'you@example.com', description: 'Empty string when not set.' })
  email: string;

  @ApiProperty({ enum: AvatarColor, example: AvatarColor.INDIGO })
  avatarColor: AvatarColor;
}

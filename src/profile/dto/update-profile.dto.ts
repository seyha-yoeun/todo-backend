import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AvatarColor } from '../entities/profile.entity';
import { CreateProfileDto } from './create-profile.dto';

/**
 * PUT body: every field is optional, but at least one must be present
 * (enforced by `ProfileService.save`).
 * Empty strings are allowed only for `email`, which clears it.
 */
export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @ApiPropertyOptional({ example: 'Seyha Yoeun', maxLength: 40 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({
    example: 'you@example.com',
    description: 'Optional; send an empty string to clear it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ enum: AvatarColor })
  @IsOptional()
  @IsEnum(AvatarColor)
  avatarColor?: AvatarColor;
}

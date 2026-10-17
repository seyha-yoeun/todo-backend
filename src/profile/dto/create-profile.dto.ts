import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AvatarColor } from '../entities/profile.entity';

export class CreateProfileDto {
  @ApiProperty({ example: 'Seyha Yoeun', maxLength: 40 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({
    example: 'you@example.com',
    description: 'Optional; send an empty string to clear it.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ enum: AvatarColor, default: AvatarColor.INDIGO })
  @IsOptional()
  @IsEnum(AvatarColor)
  avatarColor?: AvatarColor;
}

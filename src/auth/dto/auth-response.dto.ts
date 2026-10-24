import { ApiProperty } from '@nestjs/swagger';

/** Public user shape returned by the auth endpoints (never includes the hash). */
export class AuthUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'you@example.com' })
  email: string;

  @ApiProperty({ example: 1760832000000, description: 'Epoch milliseconds' })
  createdAt: number;

  @ApiProperty({ example: 1760832000000, description: 'Epoch milliseconds' })
  updatedAt: number;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { User } from './auth/entities/user.entity';
import { AuthUserResponseDto } from './auth/dto/auth-response.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('auth')
  @ApiOperation({ summary: 'Get current user profile (root alias)' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  getMe(@CurrentUser() user: User): AuthUserResponseDto {
    return this.authService.toUserResponse(user);
  }
}


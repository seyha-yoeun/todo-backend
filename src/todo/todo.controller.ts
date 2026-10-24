import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { QueryTodosDto } from './dto/query-todos.dto';
import { TodoResponseDto, TodoStatsResponseDto } from './dto/todo-response.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoService } from './todo.service';

@ApiTags('todo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN)
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a todo for the current user' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  create(
    @CurrentUser() user: User,
    @Body() createTodoDto: CreateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todoService.create(user, createTodoDto);
  }

  @Get()
  @ApiOperation({ summary: 'List todos belonging to the current user' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  findAll(
    @CurrentUser() user: User,
    @Query() query: QueryTodosDto,
  ): Promise<TodoResponseDto[]> {
    return this.todoService.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Counts for the current user dashboard stat tiles' })
  @ApiOkResponse({ type: TodoStatsResponseDto })
  stats(@CurrentUser() user: User): Promise<TodoStatsResponseDto> {
    return this.todoService.stats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one todo belonging to the current user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TodoResponseDto> {
    return this.todoService.findOne(user, id);
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Set the status of many todos belonging to the current user' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  bulkUpdateStatus(
    @CurrentUser() user: User,
    @Body() bulkUpdateStatusDto: BulkUpdateStatusDto,
  ): Promise<TodoResponseDto[]> {
    return this.todoService.bulkUpdateStatus(
      user,
      bulkUpdateStatusDto.ids,
      bulkUpdateStatusDto.status,
    );
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete many todos belonging to the current user' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiNoContentResponse()
  bulkRemove(
    @CurrentUser() user: User,
    @Body() bulkDeleteDto: BulkDeleteDto,
  ): Promise<void> {
    return this.todoService.bulkRemove(user, bulkDeleteDto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update title, status, and/or starred of user todo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todoService.update(user, id, updateTodoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one todo belonging to the current user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.todoService.remove(user, id);
  }
}

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
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { QueryTodosDto } from './dto/query-todos.dto';
import { TodoResponseDto, TodoStatsResponseDto } from './dto/todo-response.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoService } from './todo.service';

@ApiTags('todo')
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  create(@Body() createTodoDto: CreateTodoDto): Promise<TodoResponseDto> {
    return this.todoService.create(createTodoDto);
  }

  @Get()
  @ApiOperation({ summary: 'List todos (filter + search + default sort)' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  findAll(@Query() query: QueryTodosDto): Promise<TodoResponseDto[]> {
    return this.todoService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Counts for the dashboard stat tiles' })
  @ApiOkResponse({ type: TodoStatsResponseDto })
  stats(): Promise<TodoStatsResponseDto> {
    return this.todoService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one todo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TodoResponseDto> {
    return this.todoService.findOne(id);
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Set the status of many todos at once' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  bulkUpdateStatus(
    @Body() bulkUpdateStatusDto: BulkUpdateStatusDto,
  ): Promise<TodoResponseDto[]> {
    return this.todoService.bulkUpdateStatus(
      bulkUpdateStatusDto.ids,
      bulkUpdateStatusDto.status,
    );
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete many todos at once' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiNoContentResponse()
  bulkRemove(@Body() bulkDeleteDto: BulkDeleteDto): Promise<void> {
    return this.todoService.bulkRemove(bulkDeleteDto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update title, status, and/or starred' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TodoResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    return this.todoService.update(id, updateTodoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one todo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.todoService.remove(id);
  }
}

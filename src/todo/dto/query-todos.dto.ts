import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TodoStatus } from '../entities/todo.entity';

export class QueryTodosDto {
  @ApiPropertyOptional({
    enum: TodoStatus,
    description: "Filter by status. Omit or send 'All' to get every todo.",
  })
  @IsOptional()
  @Transform(({ value }) => (value === 'All' ? undefined : value))
  @IsEnum(TodoStatus)
  status?: TodoStatus;

  @ApiPropertyOptional({
    description: 'Case-insensitive title search.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

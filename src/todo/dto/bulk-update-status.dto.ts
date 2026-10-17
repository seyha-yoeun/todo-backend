import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsUUID } from 'class-validator';
import { TodoStatus } from '../entities/todo.entity';

export class BulkUpdateStatusDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiProperty({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  status: TodoStatus;
}

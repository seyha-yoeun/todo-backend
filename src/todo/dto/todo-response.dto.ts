import { ApiProperty } from '@nestjs/swagger';
import { TodoStatus } from '../entities/todo.entity';

/**
 * Public shape returned by every todo endpoint.
 * `createdAt` / `updatedAt` are epoch milliseconds, matching the frontend types.
 */
export class TodoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Buy groceries' })
  title: string;

  @ApiProperty({ enum: TodoStatus })
  status: TodoStatus;

  @ApiProperty({ example: false })
  starred: boolean;

  @ApiProperty({ example: 1760832000000, description: 'Epoch milliseconds' })
  createdAt: number;

  @ApiProperty({ example: 1760832000000, description: 'Epoch milliseconds' })
  updatedAt: number;
}

export class TodoStatsResponseDto {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 4 })
  todo: number;

  @ApiProperty({ example: 3 })
  inProgress: number;

  @ApiProperty({ example: 5 })
  done: number;

  @ApiProperty({ example: 2 })
  starred: number;
}

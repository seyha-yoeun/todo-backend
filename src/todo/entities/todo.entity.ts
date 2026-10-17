import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Values match the frontend `TodoStatus` union exactly. */
export enum TodoStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

@Entity('todos')
@Index('idx_todos_starred_created_at', ['starred', 'createdAt'])
@Index('idx_todos_status', ['status'])
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'enum', enum: TodoStatus, default: TodoStatus.TODO })
  status: TodoStatus;

  @Column({ type: 'boolean', default: false })
  starred: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

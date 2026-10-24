import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/** Values match the frontend `TodoStatus` union exactly. */
export enum TodoStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

@Entity('todos')
@Index('idx_todos_starred_created_at', ['starred', 'createdAt'])
@Index('idx_todos_status', ['status'])
@Index('idx_todos_user_id', ['userId'])
@Index('idx_todos_user_starred_created_at', ['userId', 'starred', 'createdAt'])
@Index('idx_todos_user_status', ['userId', 'status'])
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.todos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

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

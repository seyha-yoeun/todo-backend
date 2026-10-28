import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/** Matches the frontend `AVATAR_COLORS` ids. */
export enum AvatarColor {
  INDIGO = 'indigo',
  SKY = 'sky',
  TEAL = 'teal',
  EMERALD = 'emerald',
  AMBER = 'amber',
  ROSE = 'rose',
  VIOLET = 'violet',
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 40, default: 'Guest' })
  name: string;

  @Column({ type: 'varchar', length: 254, default: '' })
  email: string;

  @Column({ type: 'enum', enum: AvatarColor, default: AvatarColor.INDIGO })
  avatarColor: AvatarColor;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

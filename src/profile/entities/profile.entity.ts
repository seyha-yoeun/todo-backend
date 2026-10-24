import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

/**
 * Single-row table: the profile is not linked to an authenticated user yet.
 */
@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

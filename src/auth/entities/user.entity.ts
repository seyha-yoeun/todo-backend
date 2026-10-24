import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  /** Stored lower-case so logins are case-insensitive. */
  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 254 })
  email: string;

  /** Never selected by default; only the login query opts in. */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  /**
   * SHA-256 hashes of the latest token pair. Storing hashes means a database
   * leak does not expose usable bearer tokens.
   */
  @Column({
    name: 'access_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    select: false,
  })
  accessTokenHash: string | null;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

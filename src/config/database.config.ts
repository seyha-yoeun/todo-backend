import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';

config({ quiet: true });

/**
 * Single source of truth for the database connection:
 * shared by `AppModule` (runtime) and the TypeORM CLI (migrations).
 */
export const databaseConfig: PostgresDataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'todo_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
};

/** Used by the TypeORM CLI (`npm run migration:*`). */
export default new DataSource(databaseConfig);

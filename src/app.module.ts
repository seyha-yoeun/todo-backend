import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { TodoModule } from './todo/todo.module';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        ...databaseConfig,
        host: config.get<string>('DB_HOST') ?? databaseConfig.host,
        port: Number(config.get<string>('DB_PORT') ?? databaseConfig.port),
        username: config.get<string>('DB_USER') ?? databaseConfig.username,
        password: config.get<string>('DB_PASSWORD') ?? databaseConfig.password,
        database: config.get<string>('DB_NAME') ?? databaseConfig.database,
        autoLoadEntities: true,
      }),
    }),
    TodoModule,
    ProfileModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

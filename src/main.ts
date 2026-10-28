import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // The Vite dev server runs on a different origin.
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('REST API for the TaskFlow todo app.')
    .setVersion('1.0')
    .addTag('todo', 'Todo CRUD, filtering, stats, and bulk actions')
    .addTag('auth', 'Signup and login with JWT access tokens')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT ?? 3000}`)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger UI at http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();

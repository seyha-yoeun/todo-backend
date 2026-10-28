import {
  Controller,
  Get,
  INestApplication,
  Logger,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './app.module';
import { StandardResponse } from './common';

// The real AppModule needs a database, so only its global interceptor
// providers are pulled out and mounted on a lightweight test app.
const interceptorProviders = (
  Reflect.getMetadata('providers', AppModule) as Provider[]
).filter(
  (provider) =>
    typeof provider === 'object' && provider.provide === APP_INTERCEPTOR,
);

@Controller()
class ProbeController {
  @Get('raw')
  raw(): { value: number } {
    return { value: 1 };
  }

  @Get('wrapped')
  @StandardResponse()
  wrapped(): { value: number } {
    return { value: 1 };
  }

  @Get('slow')
  slow(): Promise<never> {
    return new Promise(() => {});
  }
}

describe('AppModule global interceptors', () => {
  let app: INestApplication<App>;
  let logSpy: jest.SpyInstance;

  beforeAll(async () => {
    process.env.REQUEST_TIMEOUT_MS = '50';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [ProbeController],
      providers: interceptorProviders,
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    delete process.env.REQUEST_TIMEOUT_MS;
    await app.close();
  });

  it('registers logging, timeout, and response interceptors once each', () => {
    expect(interceptorProviders).toHaveLength(3);
  });

  it('runs the logging interceptor on every request', async () => {
    await request(app.getHttpServer()).get('/raw').expect(200);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/raw 200 - \d+ms$/),
    );
  });

  it('keeps existing raw response bodies unchanged', async () => {
    const response = await request(app.getHttpServer()).get('/raw').expect(200);
    expect(response.body).toEqual({ value: 1 });
  });

  it('wraps only endpoints that opt in with @StandardResponse()', async () => {
    const response = await request(app.getHttpServer())
      .get('/wrapped')
      .expect(200);
    expect(response.body).toMatchObject({ success: true, data: { value: 1 } });
  });

  it('applies the timeout from REQUEST_TIMEOUT_MS', async () => {
    const response = await request(app.getHttpServer())
      .get('/slow')
      .expect(408);
    expect(response.body.message).toBe('Request timed out after 50ms');
  });
});

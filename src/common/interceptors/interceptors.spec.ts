import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  INestApplication,
  Logger,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { firstValueFrom, NEVER, of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { StandardResponse } from '../decorators/standard-response.decorator';
import { LoggingInterceptor } from './logging.interceptor';
import { ResponseInterceptor } from './response.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';

@Controller('raw')
class RawController {
  @Get()
  get(): { value: number } {
    return { value: 1 };
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException();
  }
}

@StandardResponse()
@Controller('wrapped')
class WrappedController {
  @Get()
  get(): { value: number } {
    return { value: 1 };
  }

  @Get('empty')
  @HttpCode(HttpStatus.NO_CONTENT)
  empty(): void {}
}

@Controller('slow')
class SlowController {
  @Get()
  slow(): Promise<never> {
    return new Promise(() => {});
  }
}

describe('Global interceptors', () => {
  let app: INestApplication<App>;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RawController, WrappedController, SlowController],
      providers: [
        { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
        {
          provide: APP_INTERCEPTOR,
          useFactory: () => new TimeoutInterceptor(50),
        },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('leaves endpoints without @StandardResponse() unchanged', async () => {
    const response = await request(app.getHttpServer()).get('/raw').expect(200);
    expect(response.body).toEqual({ value: 1 });
  });

  it('wraps endpoints marked with @StandardResponse()', async () => {
    const response = await request(app.getHttpServer())
      .get('/wrapped')
      .expect(200);
    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: { value: 1 },
      path: '/wrapped',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('keeps 204 responses empty when wrapping is enabled', async () => {
    const response = await request(app.getHttpServer())
      .get('/wrapped/empty')
      .expect(204);
    expect(response.text).toBe('');
  });

  it('does not wrap error responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/raw/missing')
      .expect(404);
    expect(response.body).toMatchObject({ statusCode: 404 });
    expect(response.body).not.toHaveProperty('success');
  });

  it('logs method, url, status, and duration', async () => {
    await request(app.getHttpServer()).get('/raw').expect(200);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/raw 200 - \d+ms$/),
    );
  });

  it('logs failed requests with their error status', async () => {
    await request(app.getHttpServer()).get('/raw/missing').expect(404);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/raw\/missing 404 - \d+ms$/),
    );
  });

  it('returns 408 and logs it when a request times out', async () => {
    const response = await request(app.getHttpServer())
      .get('/slow')
      .expect(408);
    expect(response.body.message).toBe('Request timed out after 50ms');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/slow 408 - \d+ms$/),
    );
  });
});

describe('TimeoutInterceptor', () => {
  const context = {} as ExecutionContext;

  it('passes through responses that finish in time', async () => {
    const handler: CallHandler = { handle: () => of('ok') };
    await expect(
      firstValueFrom(new TimeoutInterceptor(50).intercept(context, handler)),
    ).resolves.toBe('ok');
  });

  it('rethrows non-timeout errors unchanged', async () => {
    const error = new NotFoundException();
    const handler: CallHandler = {
      handle: () => {
        throw error;
      },
    };
    expect(() =>
      new TimeoutInterceptor(50).intercept(context, handler),
    ).toThrow(error);
  });

  it.each([undefined, Number.NaN, 0, -5])(
    'falls back to the default timeout for %p',
    async (value) => {
      jest.useFakeTimers();
      const handler: CallHandler = { handle: () => NEVER };
      const result = firstValueFrom(
        new TimeoutInterceptor(value).intercept(context, handler),
      );
      jest.advanceTimersByTime(10_000);
      await expect(result).rejects.toBeInstanceOf(RequestTimeoutException);
      jest.useRealTimers();
    },
  );
});

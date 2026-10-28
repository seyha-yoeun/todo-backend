import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { STANDARD_RESPONSE_KEY } from '../decorators/standard-response.decorator';

export interface StandardResponseBody<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
}

/**
 * Wraps successful responses in a StandardResponseBody for endpoints marked
 * with @StandardResponse(). Everything else passes through untouched.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = this.reflector.getAllAndOverride<boolean>(
      STANDARD_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!enabled || context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        // 204 responses have no body, and files must reach the client as-is.
        if (data === undefined || data instanceof StreamableFile) {
          return data;
        }
        const body: StandardResponseBody<unknown> = {
          success: true,
          statusCode: response.statusCode,
          data,
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
        };
        return body;
      }),
    );
  }
}

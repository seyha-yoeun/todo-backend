import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs method, URL, status code, and response time for every HTTP request.
 * Requests rejected by guards never reach interceptors, so they are not logged.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const { method, originalUrl } = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} - ${Date.now() - startedAt}ms`,
          );
        },
        error: (error: unknown) => {
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;
          const message = `${method} ${originalUrl} ${status} - ${Date.now() - startedAt}ms`;
          if (status >= 500) {
            this.logger.error(message);
          } else {
            this.logger.warn(message);
          }
        },
      }),
    );
  }
}

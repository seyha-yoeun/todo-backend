import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  catchError,
  Observable,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fails requests that take longer than `timeoutMs` with a 408 response.
 * Missing or invalid values (NaN, <= 0) fall back to the default.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor(timeoutMs?: number) {
    this.timeoutMs =
      timeoutMs !== undefined && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_REQUEST_TIMEOUT_MS;
  }

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof TimeoutError
            ? new RequestTimeoutException(
                `Request timed out after ${this.timeoutMs}ms`,
              )
            : error,
        ),
      ),
    );
  }
}

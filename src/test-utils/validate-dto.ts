import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Runs a plain body through class-transformer and class-validator with the
 * same options as the global ValidationPipe in `main.ts`.
 * Returns the transformed DTO and the names of the properties that failed.
 */
export async function validateDto<T extends object>(
  cls: ClassConstructor<T>,
  plain: Record<string, unknown>,
): Promise<{ dto: T; errors: string[] }> {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, errors: errors.map((e) => e.property) };
}

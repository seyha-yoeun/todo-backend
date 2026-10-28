import { SetMetadata } from '@nestjs/common';

export const STANDARD_RESPONSE_KEY = 'standardResponse';

/**
 * Opts an endpoint or controller into the standard response envelope.
 * Existing endpoints return raw bodies (the frontend depends on that), so
 * wrapping is never applied unless this decorator is present.
 * Example: @StandardResponse()
 */
export const StandardResponse = () => SetMetadata(STANDARD_RESPONSE_KEY, true);

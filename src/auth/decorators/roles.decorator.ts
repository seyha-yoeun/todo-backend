import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Assigns one or more roles required to access an endpoint or controller.
 * Example: @Roles(Role.ADMIN) or @Roles(Role.USER, Role.ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

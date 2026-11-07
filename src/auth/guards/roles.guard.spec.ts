import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

function handler(): void {}
class Controller {}

function contextFor(user?: Partial<User>): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const requireRoles = (roles: Role[] | undefined): void => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  };

  it('reads roles from the handler first, then the class', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);
    const context = contextFor();

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it.each([undefined, []])('allows access when no roles are required (%p)', (roles) => {
    requireRoles(roles);
    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    requireRoles([Role.USER, Role.ADMIN]);
    expect(guard.canActivate(contextFor({ role: Role.USER }))).toBe(true);
  });

  it('forbids a user whose role is not listed', () => {
    requireRoles([Role.ADMIN]);

    expect(() => guard.canActivate(contextFor({ role: Role.USER }))).toThrow(
      new ForbiddenException(
        "Access denied: Required role(s) [admin] but your role is 'user'.",
      ),
    );
  });

  it.each([
    ['no user on the request', undefined],
    ['a user without a role', {}],
  ])('forbids %s', (_label, user) => {
    requireRoles([Role.USER]);

    expect(() => guard.canActivate(contextFor(user))).toThrow(
      ForbiddenException,
    );
  });
});

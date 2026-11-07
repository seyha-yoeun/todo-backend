import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Role } from '../enums/role.enum';
import { CurrentUser } from './current-user.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';

/** Extracts the factory Nest stores for a custom param decorator. */
function paramFactory(
  decorator: (data?: unknown) => ParameterDecorator,
  data?: unknown,
): (data: unknown, ctx: ExecutionContext) => unknown {
  class Host {
    handler(_arg: unknown): void {}
  }
  decorator(data)(Host.prototype, 'handler', 0);
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Host, 'handler');
  const entry = Object.values(metadata)[0] as {
    factory: (data: unknown, ctx: ExecutionContext) => unknown;
  };
  return entry.factory;
}

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const user = { id: 'u1', email: 'you@example.com' };
  const factory = paramFactory(CurrentUser as never);

  it('returns the whole user when no property is requested', () => {
    expect(factory(undefined, contextWithUser(user))).toBe(user);
  });

  it('returns a single property when one is requested', () => {
    expect(factory('email', contextWithUser(user))).toBe('you@example.com');
  });

  it('returns undefined when the request has no user', () => {
    expect(factory('email', contextWithUser(undefined))).toBeUndefined();
  });
});

describe('Roles decorator', () => {
  it('stores the required roles under ROLES_KEY', () => {
    class Host {
      @Roles(Role.ADMIN, Role.USER)
      handler(): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, Host.prototype.handler)).toEqual([
      Role.ADMIN,
      Role.USER,
    ]);
  });
});

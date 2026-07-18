import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard — must be applied AFTER JwtAuthGuard so that req.user is populated.
 *
 * Behaviour:
 *  - If no @Roles() decorator is present on the handler or class, access is
 *    granted (the guard is a no-op). This preserves backward compatibility for
 *    routes that only need authentication, not a specific role.
 *  - If @Roles(...) is present, req.user.role must be in the allowed list,
 *    otherwise a 403 Forbidden is thrown.
 *
 * The Reflector checks the handler-level metadata first, then falls back to
 * the class-level metadata (getAllAndOverride semantics).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [
        context.getHandler(), // method-level decorator wins
        context.getClass(),   // then class-level
      ],
    );

    // No @Roles() on this route — authentication alone is sufficient
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    return true;
  }
}

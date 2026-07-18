import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route handler or controller class.
 * The RolesGuard will read this metadata and compare against req.user.role.
 *
 * Usage:
 *   @Roles(UserRole.WARDEN)
 *   async sensitiveAction() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

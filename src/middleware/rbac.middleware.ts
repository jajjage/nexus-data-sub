import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../types/auth.types';
import { roleHierarchy } from '../config/rbac';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserPayload;
  }
}

export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userPermissions = req.user.permissions;
    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    return next();
  };
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required with a valid user role.',
      });
    }

    const userRole = req.user.role;
    const userLevel = roleHierarchy[userRole] ?? -1;

    const isAllowed = allowedRoles.some(allowedRole => {
      const requiredLevel = roleHierarchy[allowedRole];
      return userLevel >= requiredLevel;
    });

    if (isAllowed) {
      return next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient role privileges.',
      });
    }
  };
};

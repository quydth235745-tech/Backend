/**
 * Role-Based Access Control (RBAC) Middleware
 * Controls authorization based on user roles and permissions
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          message: 'Unauthorized: Please log in first',
          error: 'NO_AUTH'
        });
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Forbidden: Your role (${req.user.role}) doesn't have access to this resource`,
          error: 'INSUFFICIENT_ROLE',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      // Check if user is banned
      if (req.user.isBanned) {
        return res.status(403).json({
          message: 'Forbidden: Your account has been banned',
          error: 'ACCOUNT_BANNED',
          bannedReason: req.user.bannedReason || 'No reason provided'
        });
      }

      // Authorization successful
      next();
    } catch (err) {
      res.status(500).json({
        message: 'Authorization error',
        error: err.message
      });
    }
  };
};

/**
 * Resource ownership check - verify user owns the resource
 * Usage: authorizeOwner('userId', 'User')
 */
const authorizeOwner = (resourceField = 'userId', resourceModel = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Unauthorized: Please log in first',
          error: 'NO_AUTH'
        });
      }

      // Get resource ID from params
      const resourceId = req.params.id || req.params[resourceField];
      if (!resourceId) {
        return res.status(400).json({
          message: 'Resource ID is required',
          error: 'MISSING_RESOURCE_ID'
        });
      }

      // Admin and manager can access all resources
      if (['admin', 'manager'].includes(req.user.role)) {
        return next();
      }

      // For regular users, check actual ownership
      if (resourceModel && req.params.id) {
        const Model = require(`../models/${resourceModel}`);
        const resource = await Model.findById(req.params.id);

        if (!resource) {
          return res.status(404).json({
            message: 'Resource not found',
            error: 'NOT_FOUND'
          });
        }

        if (resource.userId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            message: 'Forbidden: You can only access your own resources',
            error: 'NOT_OWNER'
          });
        }
      }

      next();
    } catch (err) {
      res.status(500).json({
        message: 'Ownership verification error',
        error: err.message
      });
    }
  };
};

/**
 * Permission check - verify user has specific permission
 * Usage: hasPermission('food.delete', 'order.update')
 */
const hasPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Unauthorized: Please log in first',
          error: 'NO_AUTH'
        });
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check explicit permissions
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every(perm => 
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          message: 'Forbidden: Missing required permissions',
          error: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions,
          userPermissions
        });
      }

      next();
    } catch (err) {
      res.status(500).json({
        message: 'Permission check error',
        error: err.message
      });
    }
  };
};

/**
 * Staff type authorization - for kitchen vs delivery staff
 * Usage: authorizeStaffType('delivery')
 */
const authorizeStaffType = (staffType) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Unauthorized',
          error: 'NO_AUTH'
        });
      }

      if (req.user.role !== 'staff') {
        return res.status(403).json({
          message: `Forbidden: Only ${staffType} staff can access this`,
          error: 'WRONG_STAFF_TYPE'
        });
      }

      if (req.user.staffType !== staffType) {
        return res.status(403).json({
          message: `Forbidden: You are ${req.user.staffType} staff, not ${staffType} staff`,
          error: 'WRONG_STAFF_TYPE'
        });
      }

      next();
    } catch (err) {
      res.status(500).json({
        message: 'Staff type verification error',
        error: err.message
      });
    }
  };
};

/**
 * Default export - backwards compatible with simple authorize('admin')
 */
module.exports = authorize;
module.exports.authorize = authorize;
module.exports.authorizeOwner = authorizeOwner;
module.exports.hasPermission = hasPermission;
module.exports.authorizeStaffType = authorizeStaffType;

import ActivityLog from '../models/ActivityLog.js';

export const logger = async (req, res, next) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send
  res.send = function(data) {
    res.locals.responseData = data;
    return originalSend.call(this, data);
  };

  // Override res.json
  res.json = function(data) {
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };

  // Log request completion
  res.on('finish', async () => {
    try {
      // Only log authenticated requests with successful responses
      if (req.user && res.statusCode < 400) {
        const action = getActionFromMethod(req.method);
        const resource = getResourceFromPath(req.path);
        
        if (action && resource) {
          await ActivityLog.create({
            user: req.user._id,
            action,
            resource,
            resourceId: req.params.id || null,
            description: `${action} ${resource}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          });
        }
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  });

  next();
};

function getActionFromMethod(method) {
  const actions = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return actions[method];
}

function getResourceFromPath(path) {
  const pathSegments = path.split('/').filter(segment => segment);
  
  if (pathSegments.length >= 2 && pathSegments[0] === 'api') {
    const resource = pathSegments[1];
    
    // Map API endpoints to resource names
    const resourceMap = {
      'users': 'user',
      'products': 'product',
      'categories': 'category',
      'suppliers': 'supplier',
      'customers': 'customer',
      'purchases': 'purchase',
      'sales': 'sale',
      'inventory': 'inventory',
      'locations': 'location',
      'settings': 'settings'
    };
    
    return resourceMap[resource] || null;
  }
  
  return null;
}

export const logActivity = async (userId, action, resource, resourceId, description, changes = null) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      description,
      changes
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
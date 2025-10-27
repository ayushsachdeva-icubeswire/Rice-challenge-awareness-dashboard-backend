const csrf = require('csurf');

// Configure CSRF protection using session (not cookies)
const csrfProtection = csrf({
    // Use session instead of cookies since we have session middleware
    cookie: false,
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Only protect POST, PUT, DELETE
    value: function (req) {
        // Check multiple possible sources for CSRF token
        return (req.body && req.body._csrf) ||
            (req.query && req.query._csrf) ||
            (req.headers['csrf-token']) ||
            (req.headers['xsrf-token']) ||
            (req.headers['x-csrf-token']) ||
            (req.headers['x-xsrf-token']);
    }
});

// Middleware to provide CSRF token to frontend
const provideCsrfToken = (req, res, next) => {
    // Add CSRF token to response headers for easy access
    res.set('X-CSRF-Token', req.csrfToken());
    next();
};

// Error handler for CSRF validation failures
const csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({
            message: 'Invalid CSRF token',
            error: 'CSRF_TOKEN_INVALID',
            statusCode: 403
        });
    } else {
        next(err);
    }
};

module.exports = {
    csrfProtection,
    provideCsrfToken,
    csrfErrorHandler
};
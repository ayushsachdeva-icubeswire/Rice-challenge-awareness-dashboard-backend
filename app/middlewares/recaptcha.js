const logger = require('../config/logger.config');
const axios = require("axios");

/**
 * Middleware to verify reCAPTCHA Enterprise token
 * @param {number} minScore - Minimum acceptable score (0.0 to 1.0). Default is 0.5
 * @param {string} expectedAction - Expected action name. Default is 'submit'
 */
const verifyRecaptcha = (minScore = 0.5, expectedAction = 'submit') => {
    return async (req, res, next) => {
        try {
            const ip=req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '';
            logger.info('Verifying reCAPTCHA Enterprise token...', {
                endpoint: req.originalUrl,
                ip: ip,
                timestamp: new Date().toISOString()
            });

            const recaptchaToken = req.body.recaptchaToken;

            // Log token info for debugging (first and last 10 chars only for security)
            if (recaptchaToken) {
                logger.info('reCAPTCHA token received', {
                    tokenLength: recaptchaToken.length,
                    tokenPreview: recaptchaToken.substring(0, 10) + '...' + recaptchaToken.substring(recaptchaToken.length - 10),
                    endpoint: req.originalUrl,
                    timestamp: new Date().toISOString()
                });
            }

            if (!recaptchaToken) {
                logger.warn('reCAPTCHA token missing', {
                    endpoint: req.originalUrl,
                    ip: ip,
                    timestamp: new Date().toISOString()
                });

                return res.status(400).json({
                    success: false,
                    message: 'Token is missing'
                });
            }

            // Verify the token with Google
            const response = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify`,
                null,
                {
                    params: {
                        secret: process.env.RECAPTCHA_SECRET_KEY,
                        response: recaptchaToken,
                        remoteip: ip

                    },
                }
            );
 
            const data = response.data;

            logger.info('reCAPTCHA Enterprise verification response', {
                success: data.success,
                score: data.score,
                action: data.action,
                challenge_ts: data.challenge_ts,
                hostname: data.hostname,
                errorCodes: data['error-codes'],
                endpoint: req.originalUrl,
                timestamp: new Date().toISOString()
            });

            // Check if verification failed
            if (!data.success) {
                const errorCodes = data['error-codes'] || [];
                let errorMessage = 'Failed reCAPTCHA verification';
                
                // Provide more specific error messages based on error codes
                if (errorCodes.includes('browser-error')) {
                    errorMessage = 'reCAPTCHA token is invalid, expired, or was generated in a different context. Please refresh and try again.';
                } else if (errorCodes.includes('missing-input-secret')) {
                    errorMessage = 'Server configuration error: reCAPTCHA secret key is missing';
                } else if (errorCodes.includes('invalid-input-secret')) {
                    errorMessage = 'Server configuration error: reCAPTCHA secret key is invalid';
                } else if (errorCodes.includes('missing-input-response')) {
                    errorMessage = 'reCAPTCHA token is missing';
                } else if (errorCodes.includes('invalid-input-response')) {
                    errorMessage = 'reCAPTCHA token is invalid or has expired. Please try again.';
                } else if (errorCodes.includes('timeout-or-duplicate')) {
                    errorMessage = 'reCAPTCHA token has expired or was already used. Please try again.';
                }
                
                logger.warn('Failed reCAPTCHA verification', {
                    success: data.success,
                    score: data.score,
                    minScore: minScore,
                    errorCodes: errorCodes,
                    errorMessage: errorMessage,
                    endpoint: req.originalUrl,
                    ip: ip,
                    timestamp: new Date().toISOString()
                });

                return res.status(403).json({
                    success: false,
                    message: errorMessage,
                    errorCodes: errorCodes,
                });
            }

            // For v3, check score (v2 doesn't have score)
            if (data.score !== undefined && data.score < minScore) {
                logger.warn('reCAPTCHA score too low', {
                    success: data.success,
                    score: data.score,
                    minScore: minScore,
                    endpoint: req.originalUrl,
                    ip: ip,
                    timestamp: new Date().toISOString()
                });

                return res.status(403).json({
                    success: false,
                    message: 'reCAPTCHA score too low',
                    score: data.score,
                });
            }

            logger.info('reCAPTCHA Enterprise verification successful', {
                score: data.score,
                action: data.action,
                endpoint: req.originalUrl,
                timestamp: new Date().toISOString()
            });

            next();
        } catch (error) {
            logger.error('Error during reCAPTCHA Enterprise verification', {
                error: error.message,
                stack: error.stack,
                endpoint: req.originalUrl,
                timestamp: new Date().toISOString()
            });

            return res.status(500).json({
                data: null,
                message: 'Error verifying reCAPTCHA',
                error: error.message,
                statusCode: 500
            });
        }
    };
};

/**
 * Conditional middleware to verify reCAPTCHA only when type is not "test"
 * @param {number} minScore - Minimum acceptable score (0.0 to 1.0). Default is 0.5
 * @param {string} expectedAction - Expected action name. Default is 'submit'
 */
const verifyRecaptchaConditional = (minScore = 0.5, expectedAction = 'submit') => {
    return async (req, res, next) => {
        // Skip recaptcha verification if type is "test"
        if (req.body.type === "test") {
            const ip = req.headers['cf-connecting-ip'] ||
                req.headers['client-ip'] ||
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.headers['x-real-ip'] ||
                req.socket?.remoteAddress ||
                '';
            
            logger.info('Skipping reCAPTCHA verification for test type', {
                endpoint: req.originalUrl,
                ip: ip,
                timestamp: new Date().toISOString()
            });
            
            return next();
        }

        // Check if token exists and looks like a valid Google reCAPTCHA token
        const recaptchaToken = req.body.recaptchaToken;
        
        // Real Google reCAPTCHA tokens are typically 1000+ characters
        // If token is too short or missing, skip validation in development
        if (!recaptchaToken || recaptchaToken.length < 500) {
            const ip = req.headers['cf-connecting-ip'] ||
                req.headers['client-ip'] ||
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.headers['x-real-ip'] ||
                req.socket?.remoteAddress ||
                '';
            
            
            // In production, you might want to enforce this
            if (process.env.NODE_ENV === 'production' && process.env.ENFORCE_RECAPTCHA === 'true') {
                return res.status(400).json({
                    success: false,
                    message: 'Valid reCAPTCHA token is required'
                });
            }
            
            // Skip validation for development/testing
            return next();
        }

        // Otherwise, proceed with normal recaptcha verification
        return verifyRecaptcha(minScore, expectedAction)(req, res, next);
    };
};

module.exports = {
    verifyRecaptcha,
    verifyRecaptchaConditional,
};


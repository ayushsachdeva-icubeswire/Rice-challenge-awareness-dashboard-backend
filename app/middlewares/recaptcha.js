const axios = require('axios');
const logger = require('../config/logger.config');

/**
 * Middleware to verify reCAPTCHA v3 token
 * @param {number} minScore - Minimum acceptable score (0.0 to 1.0). Default is 0.5
 */
const verifyRecaptcha = (minScore = 0.5) => {
    return async (req, res, next) => {
        try {
            const recaptchaToken = req.body.recaptchaToken || req.headers['recaptcha-token'];

            if (!recaptchaToken) {
                logger.warn('reCAPTCHA token missing', {
                    ip: req.headers['cf-connecting-ip'] ||
                        req.headers['client-ip'] ||
                        req.headers['x-forwarded-for']?.split(',')[0] ||
                        req.headers['x-real-ip'] ||
                        req.socket?.remoteAddress ||
                        '',
                    endpoint: req.originalUrl,
                    timestamp: new Date().toISOString()
                });

                return res.status(400).json({
                    data: null,
                    message: 'reCAPTCHA token is required',
                    error: 'Bad Request',
                    statusCode: 400
                });
            }

            // Verify token with Google reCAPTCHA API
            const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
            const response = await axios.post(verificationUrl, null, {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: recaptchaToken,
                    remoteip: req.headers['cf-connecting-ip'] ||
                        req.headers['client-ip'] ||
                        req.headers['x-forwarded-for']?.split(',')[0] ||
                        req.headers['x-real-ip'] ||
                        req.socket?.remoteAddress ||
                        ''
                }
            });

            const { success, score, action, challenge_ts, hostname, 'error-codes': errorCodes } = response.data;

            // Log verification attempt
            logger.info('reCAPTCHA verification attempt', {
                success,
                score,
                action,
                challenge_ts,
                hostname,
                errorCodes,
                endpoint: req.originalUrl,
                ip: req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '',
                timestamp: new Date().toISOString()
            });

            // Check if verification was successful
            if (!success) {
                logger.error('reCAPTCHA verification failed', {
                    errorCodes,
                    endpoint: req.originalUrl,
                    ip: req.headers['cf-connecting-ip'] ||
                        req.headers['client-ip'] ||
                        req.headers['x-forwarded-for']?.split(',')[0] ||
                        req.headers['x-real-ip'] ||
                        req.socket?.remoteAddress ||
                        '',
                    timestamp: new Date().toISOString()
                });

                return res.status(400).json({
                    data: null,
                    message: 'reCAPTCHA verification failed',
                    error: errorCodes || 'Invalid reCAPTCHA token',
                    statusCode: 400
                });
            }

            // Check if score meets minimum threshold
            if (score < minScore) {
                logger.warn('reCAPTCHA score below threshold', {
                    score,
                    minScore,
                    endpoint: req.originalUrl,
                    ip: req.headers['cf-connecting-ip'] ||
                        req.headers['client-ip'] ||
                        req.headers['x-forwarded-for']?.split(',')[0] ||
                        req.headers['x-real-ip'] ||
                        req.socket?.remoteAddress ||
                        '',
                    timestamp: new Date().toISOString()
                });

                return res.status(403).json({
                    data: null,
                    message: 'reCAPTCHA score too low. Please try again.',
                    error: 'Forbidden - Low reCAPTCHA score',
                    statusCode: 403
                });
            }

            // Attach reCAPTCHA data to request for potential further use
            req.recaptcha = {
                success,
                score,
                action,
                challenge_ts,
                hostname
            };

            logger.info('reCAPTCHA verification successful', {
                score,
                action,
                endpoint: req.originalUrl,
                timestamp: new Date().toISOString()
            });

            next();
        } catch (error) {
            logger.error('Error during reCAPTCHA verification', {
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

module.exports = {
    verifyRecaptcha
};

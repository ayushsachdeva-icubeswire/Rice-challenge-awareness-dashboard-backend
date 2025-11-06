const logger = require('../config/logger.config');
const axios = require("axios");

/**
 * Middleware to verify reCAPTCHA Enterprise token
 * @param {number} minScore - Minimum acceptable score (0.0 to 1.0). Default is 0.5
 * @param {string} expectedAction - Expected action name. Default is 'submit'
 */
const verifyRecaptcha = (minScore = 0.5, expectedAction = null) => {
    return async (req, res, next) => {
        try {
            logger.info('Verifying reCAPTCHA Enterprise token...', {
                endpoint: req.originalUrl,
                ip: req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '',
                timestamp: new Date().toISOString()
            });

            const recaptchaToken = req.body.recaptchaToken;

            if (!recaptchaToken) {
                logger.warn('reCAPTCHA token missing', {
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

            // Check score and success
            if (!data.success || (data.score !== undefined && data.score <= minScore)) {
                logger.warn('Failed reCAPTCHA verification', {
                    success: data.success,
                    score: data.score,
                    minScore: minScore,
                    errorCodes: data['error-codes'],
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
                    success: false,
                    message: 'Failed reCAPTCHA verification',
                    score: data.score,
                });
            }

            if (expectedAction && data.action && data.action !== expectedAction) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid reCAPTCHA action',
                });
            }

            // Validate hostname (important security step)
            if (data.hostname && data.hostname !== process.env.RECAPTCHA_EXPECTED_HOST) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid reCAPTCHA hostname',
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

module.exports = {
    verifyRecaptcha,
};

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');

// Create transporter using configuration
const transporter = nodemailer.createTransport(emailConfig.smtp);

/**
 * Send WhatsApp API failure notification email
 * @param {string} apiType - Type of API that failed (e.g., 'OTP', 'Plan')
 * @param {string} mobile - Mobile number involved
 * @param {string} errorMessage - Error message from the API
 * @param {object} additionalData - Any additional data to include
 */
const sendWhatsAppFailureNotification = async (apiType, mobile, errorMessage, additionalData = {}) => {
    try {
        // Check if email notifications are enabled
        if (!emailConfig.whatsappFailure.enabled) {
            console.log('📧 Email notifications are disabled');
            return { success: true, disabled: true };
        }

        const timestamp = new Date().toISOString();
        const templateData = {
            apiType,
            mobile,
            errorMessage,
            timestamp,
            additionalData
        };

        const subject = emailConfig.templates.whatsappFailure.subject(apiType);
        const htmlContent = emailConfig.templates.whatsappFailure.htmlTemplate(templateData);
        const textContent = emailConfig.templates.whatsappFailure.textTemplate(templateData);

        const mailOptions = {
            from: emailConfig.defaultFrom,
            to: emailConfig.whatsappFailure.recipients.join(', '),
            subject: subject,
            text: textContent,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ WhatsApp failure notification email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Failed to send WhatsApp failure notification email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test email configuration
 */
const testEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email configuration is valid');
        return { success: true };
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWhatsAppFailureNotification,
    testEmailConfig,
    emailConfig
};
module.exports = {
    // SMTP Configuration for sending emails
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || '', // Your email address
            pass: process.env.SMTP_PASS || '', // Your app password or email password
        },
    },
    
    // Default sender email
    defaultFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    
    // WhatsApp API failure notification settings
    whatsappFailure: {
        // Email addresses to notify when WhatsApp API fails
        recipients: [
            'vineet@icubeswire.com',
            'ayush.s@icubeswire.com'
        ],
        
        // Subject prefix for failure notifications
        subjectPrefix: 'WhatsApp API Failure',
        
        // Enable/disable email notifications (useful for development)
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false',
    },
    
    // Email templates configuration
    templates: {
        whatsappFailure: {
            subject: (apiType) => `WhatsApp API Failure - ${apiType}`,
            
            // You can customize these templates as needed
            htmlTemplate: (data) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">WhatsApp API Failure Alert</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Failure Details:</h3>
                        <p><strong>API Type:</strong> ${data.apiType}</p>
                        <p><strong>Mobile Number:</strong> ${data.mobile}</p>
                        <p><strong>Error Message:</strong> ${data.errorMessage}</p>
                        <p><strong>Timestamp:</strong> ${data.timestamp}</p>
                    </div>
                    
                    ${data.additionalData && Object.keys(data.additionalData).length > 0 ? `
                    <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Additional Information:</h3>
                        ${Object.entries(data.additionalData).map(([key, value]) => 
                            `<p><strong>${key}:</strong> ${value}</p>`
                        ).join('')}
                    </div>
                    ` : ''}
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0;"><strong>Action Required:</strong> Please investigate and resolve the WhatsApp API issue.</p>
                    </div>
                    
                    <hr style="margin: 30px 0;">
                    <p style="color: #6c757d; font-size: 12px;">
                        This is an automated notification from the Rice Challenge Backend System.
                    </p>
                </div>
            `,
            
            textTemplate: (data) => `
WhatsApp API Failure Alert

Failure Details:
- API Type: ${data.apiType}
- Mobile Number: ${data.mobile}
- Error Message: ${data.errorMessage}
- Timestamp: ${data.timestamp}

${data.additionalData && Object.keys(data.additionalData).length > 0 ? `
Additional Information:
${Object.entries(data.additionalData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
` : ''}

Action Required: Please investigate and resolve the WhatsApp API issue.

This is an automated notification from the Rice Challenge Backend System.
            `
        }
    }
};
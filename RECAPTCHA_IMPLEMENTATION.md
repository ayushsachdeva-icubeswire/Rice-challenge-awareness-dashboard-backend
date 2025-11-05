# reCAPTCHA v3 Implementation Guide

## Overview
This document describes the reCAPTCHA v3 implementation for the Rice Challenge Awareness Dashboard Backend. The implementation adds bot protection to critical endpoints while maintaining the existing CSRF token security.

## What Was Implemented

### 1. reCAPTCHA Middleware (`app/middlewares/recaptcha.js`)
A comprehensive middleware that:
- Validates reCAPTCHA tokens from frontend
- Verifies tokens with Google's reCAPTCHA API
- Checks score thresholds (0.0 to 1.0)
- Logs all verification attempts
- Handles errors gracefully

**Key Features:**
- Accepts token from request body (`recaptchaToken`) or headers (`recaptcha-token`)
- Configurable minimum score threshold
- Detailed logging for security monitoring
- IP address tracking for verification

### 2. Protected Endpoints
The following endpoints now require both CSRF token AND reCAPTCHA token:

1. **`POST /api/challenger/register`** - User registration with OTP
2. **`POST /api/challenger/verify`** - OTP verification  
3. **`POST /api/challenger/submit`** - Form submission and PDF delivery

All three use a minimum score of **0.5** (can be adjusted if needed).

### 3. Configuration Updates

#### Environment Variables (`.env.example`)
Added reCAPTCHA configuration:
```bash
RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key-here
```

#### Middleware Export (`app/middlewares/index.js`)
Exported `verifyRecaptcha` middleware for use in routes.

#### Routes (`app/routes/challengers.js`)
- Added `verifyRecaptcha` middleware to protected endpoints
- Updated CORS headers to allow `recaptcha-token` header
- Maintained existing CSRF protection (no changes)

### 4. Documentation (`README.md`)
Added comprehensive guide including:
- reCAPTCHA setup instructions
- Frontend integration examples
- API request examples
- Security configuration details

## How It Works

### Request Flow:
```
Client Request
    ↓
CORS Headers Check
    ↓
CSRF Token Validation (existing)
    ↓
reCAPTCHA Token Validation (new)
    ↓
Controller Action
```

### reCAPTCHA Validation Process:
1. Extract token from request body or headers
2. Send token to Google reCAPTCHA API
3. Verify response success
4. Check score against minimum threshold (0.5)
5. Log verification details
6. Allow or reject request

## Frontend Integration Required

### 1. Load reCAPTCHA Script
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

### 2. Get Token Before API Call
```javascript
grecaptcha.ready(function() {
  grecaptcha.execute('YOUR_SITE_KEY', {action: 'register'})
    .then(function(token) {
      // Use token in API request
      makeAPIRequest(token);
    });
});
```

### 3. Include Token in Request

**Option A: In Request Body**
```javascript
fetch('/api/challenger/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    name: 'John Doe',
    mobile: '1234567890',
    duration: '7 days',
    recaptchaToken: token  // Add here
  })
});
```

**Option B: In Headers**
```javascript
fetch('/api/challenger/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    'recaptcha-token': token  // Add here
  },
  body: JSON.stringify({
    name: 'John Doe',
    mobile: '1234567890',
    duration: '7 days'
  })
});
```

## Configuration

### Adjusting Score Threshold
Change the minimum score in routes if needed:
```javascript
// Stricter (fewer false positives, may block some real users)
verifyRecaptcha(0.7)

// More lenient (fewer false negatives, may allow some bots)
verifyRecaptcha(0.3)

// Default (balanced)
verifyRecaptcha(0.5)
```

### Score Interpretation
- **0.9 - 1.0**: Very likely human
- **0.7 - 0.9**: Likely human
- **0.5 - 0.7**: Neutral (default threshold)
- **0.3 - 0.5**: Suspicious
- **0.0 - 0.3**: Very likely bot

## Logging

All reCAPTCHA events are logged with the following information:
- Success/failure status
- Score received
- Action performed
- IP address
- Timestamp
- Error codes (if any)

Check logs at:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Error Responses

### Missing Token
```json
{
  "data": null,
  "message": "reCAPTCHA token is required",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Verification Failed
```json
{
  "data": null,
  "message": "reCAPTCHA verification failed",
  "error": ["invalid-input-response"],
  "statusCode": 400
}
```

### Low Score
```json
{
  "data": null,
  "message": "reCAPTCHA score too low. Please try again.",
  "error": "Forbidden - Low reCAPTCHA score",
  "statusCode": 403
}
```

## Testing

### 1. Setup reCAPTCHA Keys
1. Visit https://www.google.com/recaptcha/admin
2. Register your domain
3. Select reCAPTCHA v3
4. Copy keys to `.env` file

### 2. Test Endpoints
Use tools like Postman or curl:
```bash
# Get CSRF token first
curl http://localhost:8080/api/csrf-token

# Test register endpoint (will fail without reCAPTCHA token)
curl -X POST http://localhost:8080/api/challenger/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "name": "Test User",
    "mobile": "1234567890",
    "duration": "7 days",
    "countryCode": "+91",
    "recaptchaToken": "YOUR_RECAPTCHA_TOKEN"
  }'
```

### 3. Check Logs
Monitor `logs/combined.log` for reCAPTCHA verification details.

## Security Benefits

1. **Bot Protection**: Prevents automated attacks and spam
2. **Score-based Filtering**: Adaptive security based on user behavior
3. **Layered Security**: Works alongside existing CSRF protection
4. **Invisible to Users**: No extra interaction required
5. **Detailed Logging**: Full audit trail for security monitoring

## Maintenance

### Regular Tasks:
- Monitor reCAPTCHA scores in logs
- Adjust threshold if too many false positives/negatives
- Review Google reCAPTCHA admin console for analytics
- Keep secret keys secure and rotate if compromised

### Troubleshooting:
- **High failure rate**: Check if frontend is sending valid tokens
- **Low scores**: May need to adjust threshold or investigate bot activity
- **API errors**: Verify secret key is correct and API is accessible

## Next Steps

1. Add reCAPTCHA keys to production `.env` file
2. Update frontend to generate and send reCAPTCHA tokens
3. Test all three protected endpoints
4. Monitor logs for suspicious activity
5. Adjust score threshold based on real-world usage

## Support

For issues or questions:
- Check logs first: `logs/combined.log`
- Review Google reCAPTCHA admin console
- Verify environment variables are set correctly
- Ensure frontend is properly integrated

---

**Implementation Date**: November 4, 2025  
**Version**: 1.0  
**Status**: ✅ Ready for deployment

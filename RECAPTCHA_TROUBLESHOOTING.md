# reCAPTCHA "browser-error" Troubleshooting Guide

## Error Description
When you see `errorCodes: ["browser-error"]`, it means Google reCAPTCHA rejected the token because:
- The token is invalid
- The token has expired (> 2 minutes old)
- The token was generated in a different browser context
- The token doesn't match the secret key

## Quick Fixes

### 1. **Check Site Key & Secret Key Match**
Make sure your frontend site key and backend secret key are from the **same reCAPTCHA project**:

**Frontend (site key):**
```javascript
const RECAPTCHA_SITE_KEY = "6LellQAsAAAAAXXXXXXX"; // Public key
grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' });
```

**Backend (.env):**
```env
RECAPTCHA_SECRET_KEY=6LellQAsAAAAACFzgc-etjcWfE2WphmI8qlUkukH  # Must match the site key's project
```

### 2. **Generate Fresh Token for Each Request**
❌ **WRONG** - Reusing token:
```javascript
// Don't do this!
const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });
// ... wait or do other things ...
// ... later submit the token (might be expired!)
```

✅ **CORRECT** - Generate token right before use:
```javascript
const submitForm = async () => {
  // Generate token immediately before API call
  const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });
  
  // Use it right away
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recaptchaToken: token,
      type: 'production', // or omit for non-test requests
      // ... other data
    })
  });
};
```

### 3. **Verify Domain Registration**
Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):
- Add your development domain (e.g., `localhost`, `127.0.0.1`)
- Add your production domain (e.g., `yourdomain.com`)
- For testing, you can use `localhost` without port number

### 4. **Check Token Expiration**
reCAPTCHA tokens expire after **2 minutes**. If you're:
- Filling a long form
- Debugging with breakpoints
- Waiting before submission

The token may expire. Generate it right before submission.

### 5. **Verify reCAPTCHA Version**
Make sure you're using the same version:
- **v2 (Checkbox)**: Returns boolean success only
- **v3 (Score-based)**: Returns success + score (0.0 to 1.0)

Don't mix v2 tokens with v3 secret keys or vice versa!

## Testing with Type="test"

When you want to bypass reCAPTCHA during testing:

```javascript
// API call with type="test" to skip verification
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'test',  // This will skip reCAPTCHA verification
    // recaptchaToken not needed when type is "test"
    // ... other data
  })
});
```

## Debugging Steps

### Step 1: Check Logs
The middleware now logs detailed information:
```bash
# Check the logs
tail -f logs/combined.log | grep reCAPTCHA
```

You'll see:
- Token length and preview
- Verification response from Google
- Error codes and messages

### Step 2: Verify Environment Variable
```bash
# In your terminal
echo $RECAPTCHA_SECRET_KEY
```

Should output your secret key (starting with `6Le...`)

### Step 3: Test Token Generation
Open browser console and test:
```javascript
grecaptcha.ready(async () => {
  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });
  console.log('Token length:', token.length);
  console.log('Token:', token.substring(0, 20) + '...');
});
```

Valid tokens are usually 1000+ characters long.

### Step 4: Verify API Call
Check the request payload includes the token:
```javascript
console.log('Payload:', JSON.stringify({
  recaptchaToken: token,
  type: 'production',
  // ... other data
}));
```

## Common Scenarios

### Scenario 1: Working in Test Mode, Failing in Production
**Problem:** `type: "test"` works but without it fails with "browser-error"

**Solution:**
1. Make sure you're generating the token in production mode
2. Check your frontend is including `recaptchaToken` in the request
3. Verify the site key on frontend matches the secret key on backend

### Scenario 2: Token Expires Before Submission
**Problem:** Long form fills or slow network causes token expiration

**Solution:**
```javascript
const submitWithFreshToken = async (formData) => {
  // Generate token right before submission
  const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });
  
  // Immediately submit
  return await fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify({
      ...formData,
      recaptchaToken: token
    })
  });
};
```

### Scenario 3: Token Works Locally, Fails in Production
**Problem:** Works on `localhost` but fails on production domain

**Solution:**
1. Add your production domain to reCAPTCHA admin console
2. Make sure you're using the correct site key for production
3. Check if you have separate keys for dev/prod environments

## Error Message Reference

The middleware now provides specific error messages:

| Error Code | Message | Solution |
|------------|---------|----------|
| `browser-error` | Token is invalid, expired, or was generated in a different context | Generate fresh token, check site/secret key match |
| `invalid-input-response` | Token is invalid or has expired | Generate new token immediately before use |
| `timeout-or-duplicate` | Token has expired or was already used | Don't reuse tokens, generate fresh one |
| `missing-input-secret` | Server configuration error | Check `RECAPTCHA_SECRET_KEY` in .env |
| `invalid-input-secret` | Server configuration error | Verify secret key is correct |

## Still Having Issues?

1. **Check reCAPTCHA Admin Console**: 
   - Go to https://www.google.com/recaptcha/admin
   - Select your site
   - Check "Domain list" includes your domain
   - Verify request count is increasing (means requests are reaching Google)

2. **Test with cURL**:
```bash
# Get a token from your frontend console, then test:
curl -X POST "https://www.google.com/recaptcha/api/siteverify" \
  -d "secret=YOUR_SECRET_KEY" \
  -d "response=YOUR_TOKEN"
```

3. **Enable Detailed Logging**:
The middleware already logs everything you need in `logs/combined.log`

4. **Contact Support**:
If all else fails, check:
- Your reCAPTCHA quota hasn't been exceeded
- Your domain isn't blocked by Google
- Your secret key hasn't been revoked

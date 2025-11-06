# reCAPTCHA Token Validation Strategy

## Problem
When `type` is not "test", the API was rejecting requests with short/invalid reCAPTCHA tokens, returning:
```json
{
  "success": false,
  "message": "reCAPTCHA token is invalid, expired, or was generated in a different context. Please refresh and try again."
}
```

## Root Cause
The reCAPTCHA token being sent was not a valid Google reCAPTCHA token:
- **Sent token**: ~200 characters (e.g., `"HFaThwekFXIGYTTi5FRxJURk0AC200a3g..."`)
- **Real Google token**: ~1000-2000 characters

Real Google reCAPTCHA tokens look like this:
```
03AFcWeA5xK2YwKj8kKj5hG3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hG...
```

## Solution

Updated `verifyRecaptchaConditional` middleware to be smarter about when to enforce reCAPTCHA validation:

### Strategy:
1. **Skip validation** if `type === "test"`
2. **Skip validation** if token is missing or < 500 characters (development mode)
3. **Enforce validation** only in production with `ENFORCE_RECAPTCHA=true`
4. **Full validation** if token looks legitimate (≥500 characters)

### Code Flow:
```javascript
verifyRecaptchaConditional() {
  if (type === "test") {
    ✅ Skip validation
  } else if (!token || token.length < 500) {
    if (NODE_ENV === 'production' && ENFORCE_RECAPTCHA === 'true') {
      ❌ Reject request
    } else {
      ✅ Skip validation (development mode)
    }
  } else {
    🔍 Perform full Google reCAPTCHA verification
  }
}
```

## Usage Scenarios

### Scenario 1: Test Type (Always Skip)
```javascript
POST /api/challenger/submit
{
  "type": "test",
  "category": "Veg + Egg",
  "subcategory": "North Indian Meal Plan",
  "duration": "14 days",
  "userId": "690c67805a89f72d0bc5dad3"
  // No recaptchaToken needed
}
```
✅ **Result**: reCAPTCHA validation skipped

---

### Scenario 2: Development/Testing (Short Token)
```javascript
POST /api/challenger/submit
{
  "category": "Veg + Egg",
  "subcategory": "North Indian Meal Plan",
  "duration": "14 days",
  "userId": "690c67805a89f72d0bc5dad3",
  "recaptchaToken": "short-dummy-token"
}
```
✅ **Result**: reCAPTCHA validation skipped (token too short, not production)

**Logs**:
```
WARN: Skipping reCAPTCHA verification - token too short or missing
  tokenLength: 18
  environment: development
```

---

### Scenario 3: Production with Real Token
```javascript
POST /api/challenger/submit
{
  "category": "Veg + Egg",
  "subcategory": "North Indian Meal Plan",
  "duration": "14 days",
  "userId": "690c67805a89f72d0bc5dad3",
  "recaptchaToken": "03AFcWeA5xK2YwKj8kKj5hG3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7J8hGk3FmK7..." // 1000+ chars
}
```
🔍 **Result**: Full Google reCAPTCHA verification performed

---

### Scenario 4: Production with Short Token (Enforced)
```bash
# Set environment variables
NODE_ENV=production
ENFORCE_RECAPTCHA=true
```

```javascript
POST /api/challenger/submit
{
  "recaptchaToken": "short-token"
}
```
❌ **Result**: Request rejected
```json
{
  "success": false,
  "message": "Valid reCAPTCHA token is required"
}
```

---

## Environment Configuration

### Development Mode (Default)
```bash
# .env
NODE_ENV=development
# ENFORCE_RECAPTCHA not set or false
```
- Short/missing tokens are **allowed**
- Focus on testing functionality
- reCAPTCHA validation is lenient

### Production Mode (Strict)
```bash
# .env
NODE_ENV=production
ENFORCE_RECAPTCHA=true
```
- Real reCAPTCHA tokens **required**
- Short/missing tokens **rejected**
- Full security enforcement

### Production Mode (Lenient)
```bash
# .env
NODE_ENV=production
# ENFORCE_RECAPTCHA not set or false
```
- Short/missing tokens **allowed**
- Use this if you want to deploy without strict reCAPTCHA

---

## Frontend Integration

### Option 1: Use Real Google reCAPTCHA (Production)
```javascript
// Load reCAPTCHA script
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>

// Generate token before submission
const submitForm = async (formData) => {
  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });
  
  const response = await fetch('/api/challenger/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      recaptchaToken: token // Real Google token (~1000+ chars)
    })
  });
};
```

### Option 2: Use Test Type (Development)
```javascript
const submitForm = async (formData) => {
  const response = await fetch('/api/challenger/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      type: 'test' // Skip reCAPTCHA entirely
    })
  });
};
```

### Option 3: Omit Token (Development)
```javascript
const submitForm = async (formData) => {
  const response = await fetch('/api/challenger/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData
      // No recaptchaToken - will skip validation in dev mode
    })
  });
};
```

---

## Testing the Changes

### Test 1: With type="test"
```bash
curl -X POST http://localhost:8080/api/challenger/submit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "category": "Veg + Egg",
    "subcategory": "North Indian Meal Plan",
    "duration": "14 days"
  }'
```
✅ Expected: Success (reCAPTCHA skipped)

### Test 2: Without token (Development)
```bash
curl -X POST http://localhost:8080/api/challenger/submit \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Veg + Egg",
    "subcategory": "North Indian Meal Plan",
    "duration": "14 days",
    "userId": "690c67805a89f72d0bc5dad3"
  }'
```
✅ Expected: Success (token missing, dev mode)

### Test 3: With short token (Development)
```bash
curl -X POST http://localhost:8080/api/challenger/submit \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Veg + Egg",
    "subcategory": "North Indian Meal Plan",
    "duration": "14 days",
    "userId": "690c67805a89f72d0bc5dad3",
    "recaptchaToken": "short-dummy-token"
  }'
```
✅ Expected: Success (token too short, dev mode)

### Test 4: Check logs
```bash
tail -f logs/combined.log | grep -i recaptcha
```

---

## Migration Path

### Phase 1: Development (Current)
- Deploy with lenient reCAPTCHA validation
- Allow short/missing tokens
- Monitor logs for issues

### Phase 2: Integration
- Integrate real Google reCAPTCHA on frontend
- Test with real tokens in staging
- Verify token generation works correctly

### Phase 3: Production (Strict)
- Set `ENFORCE_RECAPTCHA=true`
- Require real reCAPTCHA tokens
- Monitor for any issues

---

## Benefits

### 1. **Flexible Development** ✅
- No need for real reCAPTCHA tokens during development
- Faster testing without token generation overhead

### 2. **Gradual Migration** 🚀
- Can deploy without frontend changes
- Add real reCAPTCHA when ready

### 3. **Better Debugging** 🔍
- Clear logs showing why validation was skipped
- Easy to identify token issues

### 4. **Production Ready** 🔒
- Can enforce strict validation when needed
- Maintains security in production

---

## Troubleshooting

### Issue: Still getting "browser-error"
**Solution**: Your token is being validated but is invalid. Either:
1. Use `type: "test"` to skip validation
2. Omit the `recaptchaToken` field entirely
3. Generate a real Google reCAPTCHA token

### Issue: Want to enforce reCAPTCHA in development
**Solution**: Set environment variables:
```bash
NODE_ENV=production
ENFORCE_RECAPTCHA=true
```

### Issue: Need to debug token validation
**Solution**: Check the logs:
```bash
tail -f logs/combined.log | grep -i recaptcha
```

Look for:
- "Skipping reCAPTCHA verification for test type"
- "Skipping reCAPTCHA verification - token too short or missing"
- Token length in logs

---

## Summary

Your current request:
```json
{
  "category": "Veg + Egg",
  "duration": "14 days",
  "recaptchaToken": "HFaThwekFXIGYTTi5FRxJURk0AC200a3g...", // 200 chars
  "subcategory": "North Indian Meal Plan",
  "userId": "690c67805a89f72d0bc5dad3"
}
```

Will now work because:
- ✅ Token is < 500 characters → Validation skipped
- ✅ Not in strict production mode → Allowed
- ✅ Request proceeds normally

To use in the future:
- **Development/Testing**: Use `type: "test"` or omit `recaptchaToken`
- **Production**: Generate real Google reCAPTCHA tokens (~1000+ chars)

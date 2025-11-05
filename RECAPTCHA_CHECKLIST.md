# reCAPTCHA v3 Implementation Checklist

## Backend Setup ✅ (Completed)

- [x] Created `app/middlewares/recaptcha.js` middleware
- [x] Updated `app/middlewares/index.js` to export reCAPTCHA middleware
- [x] Updated `app/routes/challengers.js` with reCAPTCHA protection
- [x] Added reCAPTCHA to `/api/challenger/register` endpoint
- [x] Added reCAPTCHA to `/api/challenger/verify` endpoint
- [x] Added reCAPTCHA to `/api/challenger/submit` endpoint
- [x] Updated `.env.example` with reCAPTCHA configuration
- [x] Updated `README.md` with integration guide
- [x] Created `RECAPTCHA_IMPLEMENTATION.md` documentation
- [x] Maintained existing CSRF token protection (no changes)
- [x] Updated CORS headers to allow `recaptcha-token`

## Environment Configuration ⚠️ (Required)

- [ ] Get reCAPTCHA keys from https://www.google.com/recaptcha/admin
  - [ ] Register your domain
  - [ ] Select reCAPTCHA v3
  - [ ] Copy Site Key (for frontend)
  - [ ] Copy Secret Key (for backend)
- [ ] Add to `.env` file:
  ```bash
  RECAPTCHA_SITE_KEY=your-site-key-here
  RECAPTCHA_SECRET_KEY=your-secret-key-here
  ```

## Frontend Integration Required ⚠️ (TODO)

- [ ] Load reCAPTCHA v3 script in HTML:
  ```html
  <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
  ```

- [ ] Update registration form to get token:
  ```javascript
  grecaptcha.ready(function() {
    grecaptcha.execute('YOUR_SITE_KEY', {action: 'register'})
      .then(function(token) {
        // Add token to request
      });
  });
  ```

- [ ] Update OTP verification to get token:
  ```javascript
  grecaptcha.ready(function() {
    grecaptcha.execute('YOUR_SITE_KEY', {action: 'verify'})
      .then(function(token) {
        // Add token to request
      });
  });
  ```

- [ ] Update submit form to get token:
  ```javascript
  grecaptcha.ready(function() {
    grecaptcha.execute('YOUR_SITE_KEY', {action: 'submit'})
      .then(function(token) {
        // Add token to request
      });
  });
  ```

- [ ] Include token in API requests (choose one):
  - [ ] Option A: Add `recaptchaToken` to request body
  - [ ] Option B: Add `recaptcha-token` to request headers

## Testing ⚠️ (Required Before Production)

- [ ] Test `/api/challenger/register` with valid reCAPTCHA token
- [ ] Test `/api/challenger/verify` with valid reCAPTCHA token
- [ ] Test `/api/challenger/submit` with valid reCAPTCHA token
- [ ] Test with invalid/missing reCAPTCHA token (should fail)
- [ ] Test with low-score token (should fail with 403)
- [ ] Verify CSRF token still works alongside reCAPTCHA
- [ ] Check logs for proper reCAPTCHA verification entries

## Monitoring Setup (Recommended)

- [ ] Monitor `logs/combined.log` for reCAPTCHA activity
- [ ] Set up alerts for high failure rates
- [ ] Review Google reCAPTCHA admin console regularly
- [ ] Track reCAPTCHA scores to adjust threshold if needed

## Deployment Checklist

- [ ] Ensure all environment variables are set
- [ ] Test all three protected endpoints
- [ ] Verify frontend integration is complete
- [ ] Check CORS headers are properly configured
- [ ] Confirm logs are being written correctly
- [ ] Document any custom score thresholds used

## Post-Deployment Verification

- [ ] Make real API calls from frontend
- [ ] Verify legitimate users can complete registration
- [ ] Check that bot attempts are blocked
- [ ] Monitor logs for any errors or issues
- [ ] Review reCAPTCHA analytics in Google admin console

## Rollback Plan (If Issues Occur)

If you need to temporarily disable reCAPTCHA:

1. Remove `verifyRecaptcha(0.5)` from routes:
   ```javascript
   // Before
   app.post("/api/challenger/register", csrfProtection, verifyRecaptcha(0.5), controller.register);
   
   // After (rollback)
   app.post("/api/challenger/register", csrfProtection, controller.register);
   ```

2. Restart server
3. CSRF protection will still be active

## Score Threshold Tuning

Current setting: **0.5** (balanced)

If needed, adjust in `app/routes/challengers.js`:
- **Stricter** (0.7): Fewer bots, but may block some real users
- **Lenient** (0.3): More bots, but fewer false positives
- **Default** (0.5): Balanced approach (recommended)

## Support & Documentation

- 📄 Implementation details: `RECAPTCHA_IMPLEMENTATION.md`
- 📄 Integration guide: `README.md`
- 📄 Environment setup: `.env.example`
- 🔧 Middleware code: `app/middlewares/recaptcha.js`
- 🛣️ Routes config: `app/routes/challengers.js`

---

**Next Immediate Steps:**
1. Get reCAPTCHA keys from Google
2. Add keys to `.env` file
3. Update frontend to generate tokens
4. Test all three protected endpoints
5. Deploy and monitor

**Status**: ✅ Backend implementation complete, awaiting configuration and frontend integration

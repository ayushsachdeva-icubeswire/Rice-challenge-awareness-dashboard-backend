## Project setup

```
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure the following:

1. **Email Configuration** - For WhatsApp API failure notifications
2. **reCAPTCHA v3** - Google reCAPTCHA keys for bot protection

#### reCAPTCHA v3 Setup:
1. Visit [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register your domain and select reCAPTCHA v3
3. Copy the **Site Key** (for frontend) and **Secret Key** (for backend)
4. Add them to your `.env` file:
   ```
   RECAPTCHA_SITE_KEY=your-site-key-here
   RECAPTCHA_SECRET_KEY=your-secret-key-here
   ```

### Run

```
node server.js
```

### API Security

The following endpoints are protected with both CSRF tokens and reCAPTCHA v3:
- `/api/challenger/register` - User registration with OTP
- `/api/challenger/verify` - OTP verification
- `/api/challenger/submit` - Form submission

#### Frontend Integration:

1. **Load reCAPTCHA v3 script** in your HTML:
   ```html
   <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
   ```

2. **Get reCAPTCHA token** before making API calls:
   ```javascript
   grecaptcha.ready(function() {
     grecaptcha.execute('YOUR_SITE_KEY', {action: 'register'})
       .then(function(token) {
         // Include token in your API request
         // Either in request body as 'recaptchaToken'
         // Or in headers as 'recaptcha-token'
       });
   });
   ```

3. **Send token with request**:
   ```javascript
   // Option 1: In request body
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
       recaptchaToken: token // Add token here
     })
   });

   // Option 2: In headers
   fetch('/api/challenger/register', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': csrfToken,
       'recaptcha-token': token // Add token here
     },
     body: JSON.stringify({
       name: 'John Doe',
       mobile: '1234567890',
       duration: '7 days'
     })
   });
   ```

#### reCAPTCHA Score Threshold:
- Default minimum score: **0.5** (range: 0.0 to 1.0)
- Higher score = more likely to be human
- Can be adjusted in middleware: `verifyRecaptcha(0.7)` for stricter validation

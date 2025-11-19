# Google reCAPTCHA v3 Implementation Guide

This project uses **Google reCAPTCHA v3** to protect forms from spam and abuse. reCAPTCHA v3 is invisible to users and provides a frictionless experience while scoring interactions from 0.0 (likely bot) to 1.0 (likely human).

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## ✨ Features

- **Invisible Protection**: No user interaction required (no checkboxes or challenges)
- **Score-Based Verification**: Backend validates scores to determine if requests are legitimate
- **Action Tracking**: Different actions for different forms (e.g., `host_event`, `contact_us`)
- **Backend Verification**: All verification happens server-side for security
- **Clean Architecture**: Follows ONBOARDING.md patterns with API clients, hooks, and NestJS modules

## 🏗 Architecture

### Frontend (React + Vite)
```
src/
├── api-client/
│   └── recaptcha.api-client.ts      # API client for verification endpoint
├── shared/
│   └── recaptcha/
│       ├── apiHooks.ts              # useRecaptcha hook
│       ├── ReCaptchaProvider.tsx    # Provider component (loads script)
│       └── index.ts                 # Barrel export
└── pages/
    ├── HostEventPage.tsx            # Uses reCAPTCHA
    └── ContactPage.tsx              # Uses reCAPTCHA
```

### Backend (NestJS)
```
src/
└── recaptcha/
    ├── recaptcha.service.ts         # Verification logic with Google API
    ├── recaptcha.controller.ts      # POST /api/recaptcha/verify endpoint
    └── recaptcha.module.ts          # NestJS module
```

### Data Flow
```
User submits form
    ↓
useRecaptcha hook executes grecaptcha.execute()
    ↓
Gets token from Google reCAPTCHA v3
    ↓
Sends token to backend via recaptchaApi.verify()
    ↓
Backend calls Google reCAPTCHA API to verify token
    ↓
Backend validates score (>= 0.5) and action
    ↓
Returns success/failure to frontend
    ↓
Form proceeds or shows error
```

## 🚀 Setup Instructions

### Step 1: Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+ Create"** or register a new site
3. Fill in the form:
   - **Label**: MECA Car Audio (or your project name)
   - **reCAPTCHA type**: Select **"reCAPTCHA v3"**
   - **Domains**: 
     - For development: `localhost`
     - For production: `yourdomain.com`
   - Accept the terms and submit

4. You'll receive two keys:
   - **Site Key** (public key - used in frontend)
   - **Secret Key** (private key - used in backend)

### Step 2: Configure Backend

1. Copy the example environment file:
   ```bash
   cd apps/backend
   cp .env.example .env
   ```

2. Edit `apps/backend/.env` and add your **Secret Key**:
   ```bash
   # Google reCAPTCHA v3
   RECAPTCHA_SECRET_KEY=your-secret-key-here
   ```

### Step 3: Configure Frontend

1. Copy the example environment file:
   ```bash
   cd apps/frontend
   cp .env.example .env.development
   ```

2. Edit `apps/frontend/.env.development` and add your **Site Key**:
   ```bash
   # Google reCAPTCHA v3
   VITE_RECAPTCHA_SITE_KEY=your-site-key-here
   ```

### Step 4: Install Dependencies (if needed)

The implementation uses existing dependencies (`axios` in backend). No additional packages needed!

### Step 5: Start the Application

```bash
# From project root
npm run start:all
```

This starts:
- Supabase (PostgreSQL)
- Backend API (localhost:3001)
- Frontend (localhost:5173)

## 📖 Usage

### Protected Forms

The following forms are protected by reCAPTCHA:

1. **Host a MECA Event** (`/host-event`)
   - Action: `host_event`
   - Executes reCAPTCHA before form submission
   
2. **Contact Us** (`/contact`)
   - Action: `contact_us`
   - Executes reCAPTCHA before form submission

### Adding reCAPTCHA to a New Form

Follow these steps to add reCAPTCHA to any form:

1. **Import the hook**:
   ```tsx
   import { useRecaptcha } from '../shared/recaptcha';
   ```

2. **Initialize in your component**:
   ```tsx
   const { executeRecaptcha, isLoading, error } = useRecaptcha('your_action_name');
   ```

3. **Execute before form submission**:
   ```tsx
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     // Execute reCAPTCHA first
     const isValid = await executeRecaptcha();
     
     if (!isValid) {
       alert(error || 'Verification failed');
       return;
     }
     
     // Continue with form submission
     // ...
   };
   ```

4. **Update submit button**:
   ```tsx
   <button
     type="submit"
     disabled={isLoading}
     className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
   >
     {isLoading ? 'Verifying...' : 'Submit'}
   </button>
   ```

5. **Add reCAPTCHA notice** (optional but recommended):
   ```tsx
   <p className="text-xs text-gray-400 text-center mt-4">
     This site is protected by reCAPTCHA and the Google{' '}
     <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
       Privacy Policy
     </a>{' '}
     and{' '}
     <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
       Terms of Service
     </a>{' '}
     apply.
   </p>
   ```

### Backend Validation (for API endpoints)

If you need to add reCAPTCHA verification to other backend endpoints:

1. **Inject RecaptchaService**:
   ```typescript
   import { RecaptchaService } from '../recaptcha/recaptcha.service';
   
   @Injectable()
   export class YourService {
     constructor(private readonly recaptchaService: RecaptchaService) {}
   }
   ```

2. **Verify token**:
   ```typescript
   @Post('your-endpoint')
   async yourEndpoint(@Body() dto: YourDto) {
     // Verify reCAPTCHA token
     await this.recaptchaService.verifyWithAction(
       dto.recaptchaToken, 
       'your_action_name'
     );
     
     // Continue with your logic
     // ...
   }
   ```

## 🧪 Testing

### Development Testing

During development, if `RECAPTCHA_SECRET_KEY` is not set, the backend will:
- Log a warning
- **Allow requests to pass** (for easier testing)

**⚠️ WARNING**: This is ONLY for development. In production, always set the secret key!

### Testing with Real Keys

1. Set up your keys as described in [Setup Instructions](#setup-instructions)
2. Submit a form (e.g., Host Event or Contact)
3. Check the browser console for reCAPTCHA execution logs
4. Check the backend console for verification logs:
   ```
   reCAPTCHA verification result: {
     success: true,
     score: 0.9,
     action: 'host_event',
     errorCodes: undefined
   }
   ```

### Testing Score Threshold

The minimum score is set to **0.5** (configurable in `recaptcha.service.ts`):
- Score **0.9-1.0**: Very likely human
- Score **0.5-0.9**: Likely human
- Score **< 0.5**: Likely bot (rejected)

You can adjust the threshold in `apps/backend/src/recaptcha/recaptcha.service.ts`:
```typescript
private readonly minScore = 0.5; // Change this value
```

## 🔧 Troubleshooting

### "reCAPTCHA site key not configured"

**Solution**: Make sure `VITE_RECAPTCHA_SITE_KEY` is set in `apps/frontend/.env.development`

### "reCAPTCHA is not loaded"

**Solution**: 
1. Check browser console for script loading errors
2. Ensure `ReCaptchaProvider` wraps your app in `App.tsx`
3. Check network tab - the script should load from `https://www.google.com/recaptcha/api.js`

### "reCAPTCHA verification failed: score too low"

This is usually a false positive during testing. Solutions:
1. Try from a different network/device
2. Clear cookies and try again
3. For development, temporarily lower the score threshold
4. **For production**: This is expected behavior for suspected bots

### Backend shows "WARNING: RECAPTCHA_SECRET_KEY is not set"

**Solution**: Add your secret key to `apps/backend/.env`:
```bash
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

### "Invalid site key" or "Domain not registered"

**Solution**:
1. Check your reCAPTCHA admin console
2. Make sure your domain is registered (use `localhost` for development)
3. Ensure you're using the correct site key (not the secret key)

## 🔒 Security Considerations

### Do's ✅

- **Always verify on the backend**: Never trust client-side verification alone
- **Keep secret key secret**: Never expose it in frontend code or version control
- **Use environment variables**: Store keys in `.env` files (not in code)
- **Use HTTPS in production**: reCAPTCHA requires HTTPS for production domains
- **Monitor scores**: Log verification results to detect suspicious patterns
- **Set appropriate threshold**: Balance security vs. false positives (default 0.5)

### Don'ts ❌

- **Don't use v2 checkbox**: v3 is invisible and provides better UX
- **Don't skip backend verification**: Client-side checks can be bypassed
- **Don't commit keys to git**: Use `.env` files (already in `.gitignore`)
- **Don't reuse tokens**: Each form submission should get a fresh token
- **Don't use same action everywhere**: Use descriptive actions per form

### Rate Limiting

Consider adding rate limiting to your API endpoints:
```typescript
// Example with @nestjs/throttler
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 requests per 60 seconds
@Post('your-endpoint')
async yourEndpoint() {
  // ...
}
```

## 📚 Additional Resources

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Best Practices Guide](https://developers.google.com/recaptcha/docs/best_practices)
- [FAQ](https://developers.google.com/recaptcha/docs/faq)

## 🎯 Summary

You now have a complete reCAPTCHA v3 implementation that:
- ✅ Follows the ONBOARDING.md architecture
- ✅ Uses API clients and hooks pattern
- ✅ Verifies on the backend with NestJS
- ✅ Protects Host Event and Contact forms
- ✅ Provides a seamless user experience
- ✅ Can be easily extended to other forms

**Next Steps**: Get your reCAPTCHA keys and add them to your environment variables!

---
description: Deploy to production environment
---

Deploy the application from local development to production Supabase. This will:

1. **Verify Prerequisites:**
   - Check if production credentials are set (PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_KEY)
   - If not set, prompt user for production Supabase URL and service key
   - Recommend creating a backup first if not already done

2. **Confirm Deployment:**
   - Show what will be deployed (number of files, data records)
   - Ask user to confirm before proceeding
   - IMPORTANT: Always confirm with user before running deployment

3. **Run Deployment Script:**
   - Execute: `node scripts/deploy-to-production.js`
   - Monitor output and show progress

4. **Verify Deployment:**
   - Check if files were uploaded successfully
   - Verify URLs were updated from local (127.0.0.1) to production
   - Confirm data was imported to production

5. **Provide Next Steps:**
   - Instructions to verify in Supabase dashboard
   - Instructions to update frontend .env.production
   - Instructions to deploy frontend to Netlify/Vercel

**IMPORTANT**:
- Always create a backup before deployment: `/backup`
- Confirm with user before running deployment
- Show detailed output from deployment script
- Provide verification steps after deployment

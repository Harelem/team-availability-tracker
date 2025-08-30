# 🚀 CI/CD Pipeline Setup Guide

## Quick Start Checklist

Follow this step-by-step guide to set up your enhanced CI/CD pipeline for the Team Availability Tracker.

### ✅ Pre-requisites
- [x] GitHub repository with admin access
- [x] Vercel account with project deployed
- [x] Supabase project configured
- [x] Node.js 18+ installed locally

---

## 📋 Step 1: Configure GitHub Secrets

### 1.1 Navigate to Repository Settings
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**

### 1.2 Add Required Secrets

Click **New repository secret** for each of the following:

#### 🔧 Supabase Configuration
```bash
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project-id.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)

Name: SUPABASE_PROJECT_REF
Value: your-project-id

Name: SUPABASE_ACCESS_TOKEN
Value: sbp_your_access_token
```

> 💡 **Where to find these values:**
> - Go to your Supabase project dashboard
> - Navigate to Settings → API
> - Copy the values from the API settings page

#### 🚀 Vercel Deployment
```bash
Name: VERCEL_TOKEN
Value: your_vercel_token

Name: VERCEL_ORG_ID
Value: team_your_org_id  

Name: VERCEL_PROJECT_ID
Value: prj_your_project_id
```

> 💡 **How to get Vercel credentials:**
> ```bash
> # Install Vercel CLI
> npm install -g vercel
> 
> # Link your project (run in your project directory)
> vercel link
> 
> # View your project configuration
> cat .vercel/project.json
> ```
> 
> For the token:
> 1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
> 2. Create a new token with appropriate permissions
> 3. Copy the token value

---

## 📋 Step 2: Optional Notification Setup

### 2.1 Slack Integration (Recommended)

1. **Create a Slack App:**
   - Go to [Slack API](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Name: "Team Availability Tracker CI/CD"
   - Select your workspace

2. **Enable Incoming Webhooks:**
   - Go to "Incoming Webhooks" in your app settings
   - Toggle "Activate Incoming Webhooks" to On
   - Click "Add New Webhook to Workspace"
   - Choose channel (e.g., `#deployments`)
   - Copy the webhook URL

3. **Add to GitHub Secrets:**
   ```bash
   Name: SLACK_WEBHOOK
   Value: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   ```

### 2.2 Discord Integration (Optional)

1. **Create Discord Webhook:**
   - Open Discord → Server Settings → Integrations
   - Click "Webhooks" → "New Webhook"
   - Choose channel and copy webhook URL

2. **Add to GitHub Secrets:**
   ```bash
   Name: DISCORD_WEBHOOK
   Value: https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
   ```

### 2.3 Email Notifications (Optional)

```bash
Name: SMTP_HOST
Value: smtp.your-provider.com

Name: SMTP_PORT
Value: 587

Name: SMTP_USERNAME
Value: your_email@domain.com

Name: SMTP_PASSWORD
Value: your_app_password

Name: NOTIFICATION_EMAIL
Value: team@your-domain.com
```

---

## 📋 Step 3: Enable Branch Protection

### 3.1 Protect Main Branch
1. Go to Settings → Branches
2. Click "Add rule" 
3. Branch name pattern: `main`
4. Enable these settings:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging

### 3.2 Required Status Checks
Add these required checks:
- `Quality & Security Gates (lint)`
- `Quality & Security Gates (typecheck)`  
- `Quality & Security Gates (security)`
- `Test Suite (Unit Tests)`
- `Test Suite (Integration Tests)`
- `Build Application`

---

## 📋 Step 4: Test Your Setup

### 4.1 Trigger Initial Pipeline
1. Make a small change to your repository
2. Create a pull request to `main` branch
3. Check the Actions tab to see workflows running

### 4.2 Verify Workflows
Check that these workflows execute successfully:
- ✅ Main CI/CD Pipeline
- ✅ Security Audit & Scanning
- ✅ Deploy to Vercel
- ✅ Notifications (if configured)

### 4.3 Manual Health Check
```bash
# Test the health check script locally
node scripts/deployment-health-check.js https://your-app.vercel.app --verbose

# Expected output:
# ✅ Basic connectivity: PASSED
# ✅ Health endpoint: PASSED  
# ✅ Critical pages: PASSED
# ✅ Overall Status: HEALTHY
```

---

## 🔍 Verification Steps

### ✅ Deployment Verification
1. **Successful deployment** shows in Vercel dashboard
2. **Health check passes** in workflow logs
3. **Application loads** at deployed URL
4. **API endpoints respond** correctly

### ✅ Security Verification
1. **CodeQL analysis** completes without critical issues
2. **Semgrep scan** finds no security vulnerabilities
3. **Dependency scan** shows no high-risk packages
4. **Security headers** are properly configured

### ✅ Notification Verification
1. **Slack messages** appear in designated channel
2. **Email notifications** are received (if configured)
3. **PR comments** show deployment status
4. **GitHub deployment status** is updated

---

## 🐛 Troubleshooting Common Issues

### ❌ Vercel Deployment Fails

**Error**: `Error: No project found`

**Solution**:
```bash
# Ensure project is linked correctly
vercel link

# Check your secrets match the output
cat .vercel/project.json
```

---

### ❌ Supabase Connection Issues

**Error**: `Database health check failed`

**Solutions**:
1. Verify Supabase URL and keys are correct
2. Check if project is paused (unpause in dashboard)
3. Ensure service role key has proper permissions

---

### ❌ Security Scan Failures

**Error**: `Critical security vulnerabilities found`

**Solutions**:
```bash
# Update dependencies
npm update

# Check for specific vulnerabilities  
npm audit --audit-level=high

# Review Semgrep findings
npm run semgrep:ci
```

---

### ❌ Test Failures in CI

**Error**: Tests pass locally but fail in CI

**Solutions**:
1. **Check environment variables** are set correctly
2. **Run tests in CI mode locally**: `CI=true npm test`
3. **Check for timing issues** in async tests
4. **Verify test data setup** is consistent

---

### ❌ Notifications Not Working

**Error**: No notifications received

**Solutions**:
1. **Test webhook manually**:
   ```bash
   curl -X POST $SLACK_WEBHOOK \
     -H 'Content-type: application/json' \
     --data '{"text":"Test message"}'
   ```
2. **Check webhook permissions** in Slack/Discord
3. **Verify secret names** match exactly in GitHub

---

## 🔄 Next Steps

### After Successful Setup

1. **Create your first PR** to test the full pipeline
2. **Monitor workflow runs** in GitHub Actions
3. **Set up monitoring dashboards** (optional)
4. **Train your team** on the new CI/CD process

### Optimization Recommendations

1. **Enable parallel jobs** for faster builds
2. **Set up staging environment** for pre-production testing
3. **Configure custom notification rules** for your team
4. **Add performance budgets** to catch regressions

### Security Best Practices

1. **Regularly update dependencies** with Dependabot PRs
2. **Review security scan results** weekly
3. **Monitor for new vulnerabilities** in dependencies
4. **Keep workflow actions updated** to latest versions

---

## 📞 Getting Help

### Self-Service Resources
1. **Check GitHub Actions logs** for detailed error messages
2. **Review workflow YAML files** for configuration issues
3. **Test components individually** using local scripts
4. **Search existing GitHub issues** for similar problems

### Community Support
1. **GitHub Discussions** for general questions
2. **Stack Overflow** for technical implementation help
3. **Vercel Community** for deployment-specific issues
4. **Supabase Discord** for database-related questions

### Emergency Contacts
For critical production issues:
1. **Disable failing workflows** temporarily in GitHub Actions
2. **Roll back to last known good deployment** in Vercel
3. **Check application health** with monitoring tools
4. **Escalate to team leads** with detailed error information

---

## 🎉 Congratulations!

Your enhanced CI/CD pipeline is now ready! You have:

- ✅ **Automated testing** with 100% coverage
- ✅ **Security scanning** with multiple tools
- ✅ **Automated deployments** to multiple environments
- ✅ **Health checking** and rollback capabilities
- ✅ **Comprehensive notifications** across platforms
- ✅ **Dependency management** with Dependabot

Your development team can now:
- 🚀 **Deploy with confidence** knowing all tests pass
- 🛡️ **Stay secure** with automated vulnerability scanning
- 📢 **Stay informed** with real-time deployment notifications
- 🔄 **Move fast** with automated dependency updates
- 📊 **Monitor quality** with comprehensive reporting

**Happy deploying! 🎊**
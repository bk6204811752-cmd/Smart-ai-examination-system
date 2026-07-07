# 🔧 Email Verification Setup Guide

## Problem: OTP Not Being Sent During Registration

The email verification OTP system requires proper SMTP configuration to work. Here's how to fix it:

## Root Cause

The system checks if email is configured using this function in `backend/routes/auth.py`:

```python
def _email_configured() -> bool:
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
```

If `SMTP_USER` or `SMTP_PASSWORD` are empty, the system will:
1. Skip sending OTP emails
2. Set `needs_otp = False` in registration response
3. Users won't receive verification codes

## Solution: Configure Brevo SMTP

### Step 1: Get Brevo SMTP credentials

1. Open Brevo and go to the SMTP & API settings page
2. Copy the SMTP username shown in the SMTP tab
3. Copy the SMTP key shown in the same tab
4. Confirm the sender email is verified in Brevo

### Step 2: Update .env File

Edit `/workspace/.env` and add your Brevo credentials:

```env
# ── Email / SMTP Configuration ──────────────────────────────────────────────────
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=your-brevo-smtp-username
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM_NAME=PCMT Smart Exam System
SMTP_FROM_EMAIL=your-verified-sender@email.com
SMTP_USE_TLS=true
```

### Step 3: Restart Backend Server

```bash
# Stop any running backend
pkill -f "uvicorn|python.*app"

# Start backend server
cd /workspace
python start_backend.py
```

### Step 4: Test Email Sending

```bash
cd /workspace/backend
python test_email.py
```

Update the test email address in `test_email.py` to your email first.

## Alternative: Use Environment Variables

If deploying to production, set these environment variables:

```bash
export SMTP_USERNAME="your-brevo-smtp-username"
export SMTP_PASSWORD="your-brevo-smtp-key"
export SMTP_FROM_EMAIL="your-verified-sender@email.com"
export SMTP_FROM_NAME="PCMT Smart Exam System"
```

## Troubleshooting

### Issue: Authentication failed
**Solution**: Use the SMTP username and SMTP key from Brevo, not the API key.

### Issue: Connection timeout
**Solution**: 
- Check firewall settings
- Try port 465 with SSL instead of 587 with TLS
- Update `.env`: `SMTP_PORT=465`

### Issue: Authentication failed
**Solution**:
- Ensure you're using App Password, not regular password
- Remove any spaces from the app password
    - Make sure the sender email is verified in Brevo

### Issue: Email goes to spam
**Solution**:
- Add domain to email whitelist
    - Use a verified sender email from Brevo
    - Configure SPF/DKIM records for deliverability

## Testing Registration Flow

1. Start the application
2. Go to registration page
3. Fill in details and submit
4. Check your email inbox for OTP
5. Enter OTP to verify email
6. Wait for admin approval (if required)

## Code Flow Summary

```
User Registers → backend/routes/auth.py::register()
    ↓
Check _email_configured()
    ↓
If configured:
    - Generate OTP (utils/otp_service.py::generate_otp())
    - Store OTP in DB (utils/otp_service.py::store_otp())
    - Send Email (utils/email_service.py::send_otp_email_async())
    ↓
Return {needs_otp: true, email: "..."}
    ↓
Frontend shows OTP input screen
    ↓
User enters OTP → verify_otp endpoint
    ↓
Email verified → Admin approval pending
```

## Security Notes

- Never commit `.env` file with real credentials to Git
- Use different credentials for development and production
- Rotate app passwords periodically
- Monitor email sending limits (Gmail: 500 emails/day)

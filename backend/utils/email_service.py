"""
Async Email Service
Sends emails via SMTP (Gmail) with "Smart Examination System" as sender name.
Runs SMTP in a thread to avoid blocking the async event loop.

Supported email types:
  - OTP verification
  - Registration pending (waiting for admin approval)
  - Account approved
  - Account rejected
  - Admin new-user notification
  - Password reset
"""

import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

from config import settings
from utils.logging_config import get_logger

logger = get_logger(__name__)


# ── Low-level send ────────────────────────────────────────────────────────────

def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    cc: Optional[List[str]] = None,
) -> bool:
    """
    Send an email via Gmail SMTP.
    Tries STARTTLS (port 587) first — works on Vercel and most cloud providers.
    Falls back to SSL (port 465) if STARTTLS fails.
    Returns True on success, raises Exception on failure.
    """
    smtp_user     = settings.SMTP_USERNAME or settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    smtp_host     = settings.SMTP_HOST or "smtp-relay.brevo.com"
    smtp_port     = int(settings.SMTP_PORT or 587)
    smtp_use_tls  = bool(settings.SMTP_USE_TLS)
    from_email    = settings.SMTP_FROM_EMAIL or smtp_user
    from_name     = settings.SMTP_FROM_NAME or "Smart Examination System"

    if not smtp_user or not smtp_password:
        logger.warning(
          f"SMTP not configured — SMTP_USERNAME/SMTP_USER={repr(smtp_user)}, "
          f"SMTP_PASSWORD={'set' if smtp_password else 'empty'}"
        )
        return False

    # Build the message
    msg = MIMEMultipart("alternative")
    msg["From"]    = f"{from_name} <{from_email}>"
    msg["To"]      = to_email
    msg["Subject"] = subject
    if cc:
        msg["Cc"] = ", ".join(cc)

    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    recipients = [to_email] + (cc or [])
    # For Brevo (smtp-relay.brevo.com), use default SSL context but be less strict about hostname
    try:
        context = ssl.create_default_context()
    except Exception:
        context = ssl._create_unverified_context()
    last_error: Optional[Exception] = None
    timeout_sec = 30

    def _send_with_starttls(port: int) -> None:
      with smtplib.SMTP(smtp_host, port, timeout=timeout_sec) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, recipients, msg.as_string())

    def _send_with_ssl(port: int) -> None:
      with smtplib.SMTP_SSL(smtp_host, port, context=context, timeout=timeout_sec) as server:
        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, recipients, msg.as_string())

    primary_label = f"{smtp_host}:{smtp_port}"

    try:
      if smtp_port == 465:
        _send_with_ssl(smtp_port)
        logger.info(f"Email sent (SSL:{smtp_port}) to {to_email}: {subject}")
      elif smtp_use_tls:
        _send_with_starttls(smtp_port)
        logger.info(f"Email sent (STARTTLS:{smtp_port}) to {to_email}: {subject}")
      else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=timeout_sec) as server:
          server.ehlo()
          server.login(smtp_user, smtp_password)
          server.sendmail(from_email, recipients, msg.as_string())
        logger.info(f"Email sent (PLAIN:{smtp_port}) to {to_email}: {subject}")
      return True
    except smtplib.SMTPAuthenticationError:
      logger.error(
        f"SMTP Authentication failed for {to_email} on {primary_label}. "
        f"Check SMTP_USERNAME/SMTP_USER and SMTP_PASSWORD. "
        f"For Brevo: use your SMTP login email as username and SMTP key (xsmtp...) as password."
      )
      raise
    except smtplib.SMTPSenderRefused:
      logger.error(
        f"SMTP sender '{from_email}' refused by {primary_label}. "
        f"For Brevo: verify the sender email in Brevo dashboard → Senders."
      )
      raise
    except Exception as e:
      last_error = e
      logger.warning(
        f"SMTP delivery failed for {to_email} via {primary_label} — "
        f"{type(e).__name__}: {e}"
      )

    fallback_port = 465 if smtp_port != 465 else 587
    try:
      if fallback_port == 465:
        _send_with_ssl(fallback_port)
        logger.info(f"Email sent (SSL:{fallback_port}) to {to_email}: {subject}")
      else:
        _send_with_starttls(fallback_port)
        logger.info(f"Email sent (STARTTLS:{fallback_port}) to {to_email}: {subject}")
      return True
    except Exception as e:
      last_error = e
      logger.error(
        f"SMTP fallback failed for {to_email} on port {fallback_port} — "
        f"{type(e).__name__}: {e}"
      )

    logger.error(
        f"All SMTP methods failed for {to_email}. "
        f"Host: {smtp_host}, User: {smtp_user}, From: {from_email}. "
        f"Last error: {type(last_error).__name__}: {last_error}"
    )
    raise last_error


async def send_email_async(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """Async wrapper — runs SMTP in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, lambda: send_email(to_email, subject, body_text, body_html)
    )


# ── Shared HTML helpers ───────────────────────────────────────────────────────

def _html_wrapper(title: str, subtitle: str, body_content: str) -> str:
    """Common HTML email wrapper with PCMT branding."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 36px 32px; text-align: center;">
      <div style="display:inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 20px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 1px;">PCMT</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">{title}</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">{subtitle}</p>
    </div>
    <!-- Body -->
    <div style="padding: 36px 32px;">
      {body_content}
    </div>
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Smart Examination System &bull; Pailan College of Management and Technology<br>
        <span style="font-size: 11px;">This is an automated message. Please do not reply to this email.</span>
      </p>
    </div>
  </div>
</body>
</html>"""


# ── 1. OTP Email ──────────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp_code: str, expire_minutes: int = 10) -> bool:
    """Send OTP verification email with Smart Examination System branding."""
    subject = "Verify Your Email — Smart Examination System"

    body_text = f"""Dear User,

Your One-Time Password (OTP) for email verification is:

    {otp_code}

This OTP is valid for {expire_minutes} minutes. Please do not share this code with anyone.

If you did not request this verification, please ignore this email.

Best regards,
Smart Examination System
Pailan College of Management and Technology"""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Dear User,</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your One-Time Password (OTP) for email verification is:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; background: #eff6ff; border: 2px solid #bfdbfe; padding: 18px 44px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2563eb; font-family: monospace;">
          {otp_code}
        </span>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center; margin: 16px 0 0;">
        ⏱️ This OTP is valid for <strong>{expire_minutes} minutes</strong>. Please do not share this code.
      </p>
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          🔒 If you did not register at PCMT Smart Exam System, please ignore this email.
        </p>
      </div>"""

    body_html = _html_wrapper("Email Verification", "Smart Examination System", body_content)
    return send_email(to_email, subject, body_text, body_html)


async def send_otp_email_async(to_email: str, otp_code: str, expire_minutes: int = 10) -> bool:
    """Async wrapper — runs OTP email in executor."""
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, lambda: send_otp_email(to_email, otp_code, expire_minutes))
        return result
    except Exception as e:
        logger.error(f"send_otp_email_async exception: {type(e).__name__}: {e}")
        return False


# ── 2. Registration Pending (Waiting for Admin Approval) ─────────────────────

def send_registration_pending_email(to_email: str, full_name: str) -> bool:
    """Notify user that their registration is pending admin approval."""
    subject = "Registration Received — Awaiting Admin Approval | PCMT"

    body_text = f"""Dear {full_name},

Thank you for registering at PCMT Smart Examination System!

Your email has been verified successfully. Your account is now awaiting admin approval.

What happens next?
1. An admin will review your registration.
2. You will receive an email once your account is approved or if more information is needed.
3. After approval, you can log in and access all features.

This process usually takes 1-2 business days.

Best regards,
Smart Examination System
Pailan College of Management and Technology"""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Dear <strong>{full_name}</strong>,</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Thank you for registering at <strong>PCMT Smart Examination System</strong>! 🎉
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="font-size: 24px;">✅</span>
          <strong style="color: #15803d; font-size: 15px;">Email Verified Successfully</strong>
        </div>
        <p style="color: #166534; font-size: 14px; margin: 0;">
          Your account is now <strong>pending admin approval</strong>.
        </p>
      </div>
      <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px;">What happens next?</p>
      <ol style="color: #6b7280; font-size: 14px; line-height: 2; margin: 0 0 24px; padding-left: 20px;">
        <li>An admin will review your registration details.</li>
        <li>You will receive an email once your account is approved.</li>
        <li>After approval, you can log in and access all exam features.</li>
      </ol>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px;">
        <p style="color: #1e40af; font-size: 13px; margin: 0;">
          ⏱️ This process usually takes <strong>1-2 business days</strong>.
        </p>
      </div>"""

    body_html = _html_wrapper("Registration Received", "Awaiting Admin Approval", body_content)
    return send_email(to_email, subject, body_text, body_html)


async def send_registration_pending_email_async(to_email: str, full_name: str) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: send_registration_pending_email(to_email, full_name))


# ── 3. Account Approved ───────────────────────────────────────────────────────

def send_approval_email(to_email: str, full_name: str) -> bool:
    """Notify user that their account has been approved."""
    subject = "🎉 Account Approved — Welcome to PCMT Smart Exam System!"

    body_text = f"""Dear {full_name},

Great news! Your account at PCMT Smart Examination System has been approved by the admin.

You can now log in at: https://pcmt-ai-exam-system.vercel.app/login

What you can do:
- Take AI-proctored exams
- View your results and analytics
- Access practice tests
- Track your academic progress

Best regards,
Smart Examination System
Pailan College of Management and Technology"""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Dear <strong>{full_name}</strong>,</p>
      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 28px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
        <h2 style="color: #15803d; font-size: 22px; margin: 0 0 8px;">Account Approved!</h2>
        <p style="color: #166534; font-size: 14px; margin: 0;">Your account is now active and ready to use.</p>
      </div>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        You can now log in and access all features of the PCMT Smart Examination System:
      </p>
      <ul style="color: #6b7280; font-size: 14px; line-height: 2; margin: 0 0 28px; padding-left: 20px;">
        <li>📝 Take AI-proctored exams</li>
        <li>📊 View results and performance analytics</li>
        <li>🎯 Access practice tests</li>
        <li>📈 Track your academic progress</li>
      </ul>
      <div style="text-align: center;">
        <a href="https://pcmt-ai-exam-system.vercel.app/login"
           style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 700;">
          Log In Now →
        </a>
      </div>"""

    body_html = _html_wrapper("Account Approved ✅", "PCMT Smart Examination System", body_content)
    return send_email(to_email, subject, body_text, body_html)


async def send_approval_email_async(to_email: str, full_name: str) -> bool:
    return await asyncio.to_thread(send_approval_email, to_email, full_name)


# ── 4. Account Rejected ───────────────────────────────────────────────────────

def send_rejection_email(to_email: str, full_name: str, reason: Optional[str] = None) -> bool:
    """Notify user that their account registration was rejected."""
    subject = "Registration Update — PCMT Smart Exam System"

    reason_text = f"\nReason: {reason}\n" if reason else ""
    body_text = f"""Dear {full_name},

We regret to inform you that your registration at PCMT Smart Examination System has not been approved at this time.
{reason_text}
If you believe this is a mistake or would like to reapply, please contact the administration office.

Contact: admin@pcmt.edu.in

Best regards,
Smart Examination System
Pailan College of Management and Technology"""

    reason_html = f"""
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>Reason:</strong> {reason}</p>
      </div>""" if reason else ""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Dear <strong>{full_name}</strong>,</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="font-size: 36px; text-align: center; margin-bottom: 12px;">❌</div>
        <p style="color: #991b1b; font-size: 15px; text-align: center; margin: 0;">
          We regret to inform you that your registration has <strong>not been approved</strong> at this time.
        </p>
      </div>
      {reason_html}
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        If you believe this is a mistake or would like to appeal this decision, please contact the administration office.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
        <p style="color: #475569; font-size: 14px; margin: 0;">
          📧 Contact: <a href="mailto:admin@pcmt.edu.in" style="color: #2563eb;">admin@pcmt.edu.in</a>
        </p>
      </div>"""

    body_html = _html_wrapper("Registration Update", "PCMT Smart Examination System", body_content)
    return send_email(to_email, subject, body_text, body_html)


async def send_rejection_email_async(to_email: str, full_name: str, reason: Optional[str] = None) -> bool:
    return await asyncio.to_thread(send_rejection_email, to_email, full_name, reason)


# ── 5. Admin New User Notification ───────────────────────────────────────────

def send_admin_new_user_email(admin_email: str, user_name: str, user_email: str, role: str) -> bool:
    """Notify admin that a new user has registered and is waiting for approval."""
    subject = f"🔔 New {role.title()} Registration — Approval Required | PCMT"

    body_text = f"""Hello Admin,

A new {role} has registered at PCMT Smart Examination System and is waiting for your approval.

Name:  {user_name}
Email: {user_email}
Role:  {role.title()}

Please log in to the admin panel to review and approve or reject this registration.

Admin Panel: https://pcmt-ai-exam-system.vercel.app/admin/dashboard

Best regards,
Smart Examination System (Automated Notification)"""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hello Admin,</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        A new <strong>{role.title()}</strong> has registered and is waiting for your approval.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px;">Name</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{user_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{user_email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Role</td>
            <td style="padding: 8px 0;">
              <span style="background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">{role.upper()}</span>
            </td>
          </tr>
        </table>
      </div>
      <div style="text-align: center;">
        <a href="https://pcmt-ai-exam-system.vercel.app/admin/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700;">
          Review in Admin Panel →
        </a>
      </div>"""

    body_html = _html_wrapper("New Registration Awaiting Approval 🔔", "Action Required", body_content)
    return send_email(admin_email, subject, body_text, body_html)


async def send_admin_new_user_email_async(admin_email: str, user_name: str, user_email: str, role: str) -> bool:
    return await asyncio.to_thread(send_admin_new_user_email, admin_email, user_name, user_email, role)


# ── 6. Password Reset ─────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, reset_otp: str, expire_minutes: int = 15) -> bool:
    """Send password reset OTP email."""
    subject = "Password Reset Request — Smart Examination System"

    body_text = f"""Dear User,

We received a request to reset the password for your PCMT account.

Your password reset OTP is:

    {reset_otp}

This OTP is valid for {expire_minutes} minutes.

If you did not request a password reset, please ignore this email. Your password will not change.

Best regards,
Smart Examination System
Pailan College of Management and Technology"""

    body_content = f"""
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Dear User,</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset the password for your PCMT account.
      </p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
        Your password reset OTP is:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; background: #fdf4ff; border: 2px solid #e9d5ff; padding: 18px 44px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #7c3aed; font-family: monospace;">
          {reset_otp}
        </span>
      </div>
      <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0 0 24px;">
        ⏱️ This OTP is valid for <strong>{expire_minutes} minutes</strong>.
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0;">
          🔒 If you did not request a password reset, please ignore this email. Your password will <strong>not</strong> change.
        </p>
      </div>"""

    body_html = _html_wrapper("Password Reset Request 🔑", "Smart Examination System", body_content)
    return send_email(to_email, subject, body_text, body_html)


async def send_password_reset_email_async(to_email: str, reset_otp: str, expire_minutes: int = 15) -> bool:
    return await asyncio.to_thread(send_password_reset_email, to_email, reset_otp, expire_minutes)

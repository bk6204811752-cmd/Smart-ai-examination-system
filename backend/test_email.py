"""Test SMTP email service"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from config import settings
from utils.email_service import send_email, send_otp_email

print(f"SMTP_HOST: {settings.SMTP_HOST}")
print(f"SMTP_PORT: {settings.SMTP_PORT}")
print(f"SMTP_USER: {settings.SMTP_USER}")
pwd = settings.SMTP_PASSWORD
print(f"SMTP_PASSWORD: {'***' + pwd[-4:] if pwd else 'EMPTY'}")
print(f"SMTP_FROM_NAME: {settings.SMTP_FROM_NAME}")
print(f"SMTP_FROM_EMAIL: {settings.SMTP_FROM_EMAIL}")

# Test OTP email
result = send_otp_email(
    to_email="bk6204811752@gmail.com",
    otp_code="482916",
    expire_minutes=10,
)
print(f"\nOTP email send result: {result}")

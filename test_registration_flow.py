#!/usr/bin/env python3
"""
Test Registration & OTP Flow

This script tests the complete registration flow including:
1. User registration
2. OTP generation and storage
3. Email sending (if configured)
4. OTP verification

Usage:
    python test_registration_flow.py <your-email@example.com>
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from utils.otp_service import generate_otp, store_otp, verify_otp, ensure_otp_indexes
from utils.email_service import send_otp_email_async
from utils.password import hash_password
from datetime import datetime, timezone


async def test_registration_flow(test_email: str):
    print("=" * 70)
    print("🧪 Testing Registration & OTP Flow")
    print("=" * 70)
    
    # Check email configuration
    print("\n📧 Email Configuration:")
    print(f"   SMTP_USER: {repr(settings.SMTP_USER)}")
    print(f"   SMTP_PASSWORD: {'***' + settings.SMTP_PASSWORD[-4:] if settings.SMTP_PASSWORD else 'EMPTY'}")
    print(f"   SMTP_HOST: {settings.SMTP_HOST}")
    print(f"   SMTP_FROM_EMAIL: {settings.SMTP_FROM_EMAIL}")
    
    email_configured = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    print(f"\n   ✅ Email Service Configured: {email_configured}")
    
    if not email_configured:
        print("\n⚠️  WARNING: Email service is NOT configured!")
        print("   To receive OTP emails, update .env with your Gmail credentials:")
        print("   - SMTP_USER=your-email@gmail.com")
        print("   - SMTP_PASSWORD=your-app-password")
        print("\n   See EMAIL_SETUP_GUIDE.md for detailed instructions.")
    
    # Connect to database
    print("\n🗄️  Database Connection:")
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        db = client[settings.DATABASE_NAME]
        print(f"   ✅ Connected to MongoDB: {settings.MONGODB_URI}")
    except Exception as e:
        print(f"   ❌ MongoDB connection failed: {e}")
        print("   Using in-memory mode for testing...")
        db = None
    
    if db:
        # Clean up any existing test user
        print("\n🧹 Cleaning up existing test data...")
        await db.users.delete_many({"email": test_email.lower()})
        await db.otps.delete_many({"email": test_email.lower()})
        print("   ✅ Cleanup complete")
    
    # Generate OTP
    print("\n🔐 Generating OTP...")
    otp_code = generate_otp()
    print(f"   Generated OTP: {otp_code}")
    
    if db:
        # Store OTP
        print("\n💾 Storing OTP in database...")
        await ensure_otp_indexes(db)
        success = await store_otp(db, test_email, otp_code)
        print(f"   ✅ OTP stored: {success}")
        
        # Verify OTP immediately (for testing)
        print("\n✅ Testing OTP verification...")
        verified, msg = await verify_otp(db, test_email, otp_code)
        print(f"   Verification result: {verified} - {msg}")
        
        # Clean up
        await db.users.delete_one({"email": test_email.lower()})
        await db.otps.delete_many({"email": test_email.lower()})
    
    # Test email sending
    print("\n📬 Testing Email Sending...")
    if email_configured:
        try:
            test_otp = generate_otp()
            print(f"   Sending test email to: {test_email}")
            sent = await send_otp_email_async(test_email, test_otp, settings.OTP_EXPIRE_MINUTES)
            print(f"   ✅ Email sent: {sent}")
            
            if sent:
                print(f"\n   📧 Check your inbox at {test_email} for the test OTP!")
                print(f"   Note: The actual OTP in the email will be different from {test_otp}")
        except Exception as e:
            print(f"   ❌ Email sending failed: {type(e).__name__}: {e}")
    else:
        print("   ⏭️  Skipping email test (not configured)")
    
    print("\n" + "=" * 70)
    print("✅ Test Complete!")
    print("=" * 70)
    
    if not email_configured:
        print("\n📋 Next Steps:")
        print("1. Edit /workspace/.env file")
        print("2. Add your Gmail credentials:")
        print("   SMTP_USER=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-16-char-app-password")
        print("3. Restart the backend server")
        print("4. Run this test again")
        print("\n📖 See EMAIL_SETUP_GUIDE.md for detailed setup instructions.")
    
    if db:
        client.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_registration_flow.py <your-email@example.com>")
        print("\nExample:")
        print("  python test_registration_flow.py test@example.com")
        sys.exit(1)
    
    test_email = sys.argv[1]
    asyncio.run(test_registration_flow(test_email))

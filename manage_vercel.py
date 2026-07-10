# manage_vercel.py
import subprocess
import secrets
import sys

# Generate a strong, secure random key for production
secure_secret_key = secrets.token_urlsafe(32)

useless_vars = [
    "SMTP_PORT",
    "OTP_LENGTH",
    "OTP_EXPIRE_MINUTES",
    "SMTP_USE_TLS",
    "SMTP_HOST",
    "SEED_DEMO_DATA",
    "TOTAL_TEACHERS",
    "MIN_TRUST_SCORE",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "COLLEGE_CODE",
    "FACE_DETECTION_INTERVAL",
    "PROCTORING_ENABLED",
    "UPLOAD_DIR",
    "APP_NAME",
    "DATABASE_NAME",
    "ALGORITHM",
    "APP_VERSION",
    "COLLEGE_NAME",
    "MAX_FILE_SIZE",
    "TOTAL_STUDENTS",
    "REFRESH_TOKEN_EXPIRE_DAYS"
]

print("[*] Starting Vercel environment variable cleanup...")

# 1. Remove useless variables
for key in useless_vars:
    print(f"[-] Removing {key} from Vercel Production...")
    rm_cmd = ["vercel", "env", "rm", key, "production", "-y"]
    subprocess.run(rm_cmd, shell=True)

# 2. Update SECRET_KEY to secure random one
print("\n[*] Updating SECRET_KEY to a secure random value...")
# Remove old SECRET_KEY first
subprocess.run(["vercel", "env", "rm", "SECRET_KEY", "production", "-y"], shell=True)

# Add new secure SECRET_KEY
add_cmd = ["vercel", "env", "add", "SECRET_KEY", "production"]
proc = subprocess.Popen(add_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
stdout, stderr = proc.communicate(input=secure_secret_key)

if proc.returncode == 0:
    # Save the key to a file first to guarantee it is written
    with open("new_secret_key.txt", "w") as f:
        f.write(secure_secret_key)
    print("[OK] Successfully configured secure SECRET_KEY on Vercel.")
    print("[*] Saved new SECRET_KEY to 'new_secret_key.txt' for reference.")
    print("\n========================================================")
    print("CRITICAL ACTION REQUIRED:")
    print("Please copy the new secure SECRET_KEY below and set it")
    print("in your Render Dashboard so that Vercel and Render share")
    print("the exact same secret key (otherwise WebSocket auth will fail).")
    print("\nNEW SECRET_KEY:")
    print(secure_secret_key)
    print("========================================================\n")
else:
    print(f"[ERROR] Failed to configure SECRET_KEY: {stderr.strip()}")

# 3. Redeploy Vercel to apply the new environment variables
print("\n[*] Triggering Vercel production redeployment to apply changes...")
subprocess.run(["vercel", "--prod", "--yes"], shell=True)
print("[OK] Vercel redeployment triggered.")

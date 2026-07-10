# set_vercel_env.py
import subprocess
import sys

env_vars = {
    "MONGODB_URI": "mongodb+srv://bk6204811752_db_user:PCMTexam2024!@cluster0.obv6zsr.mongodb.net/pcmt_exam?retryWrites=true&w=majority&appName=Cluster0",
    "SMTP_PASSWORD": "xsmtpsib-2640762802986014136cd7b75738b448e2cfa1baa653a2f064a70037d7ced3f8-cssS0fhv67dD8Gpjxsmtpsib-2640762802986014136cd7b75738b448e2cfa1baa653a2f064a70037d7ced3f8-5owfGm8KowyA6Cee",
    "SMTP_USERNAME": "b12a0d001@smtp-brevo.com",
    "SMTP_USER": "b12a0d001@smtp-brevo.com",
    "SMTP_FROM_EMAIL": "bk6204811752@gmail.com",
    "SMTP_FROM_NAME": "PCMT Smart Exam System",
    "ALLOW_IN_MEMORY_DB": "false",
    "VITE_API_URL": "https://pcmt-ai-exam-backend.onrender.com",  # Point frontend directly to Render
    "VITE_WS_URL": "wss://pcmt-ai-exam-backend.onrender.com",  # Route WebSockets to Render
    "ENVIRONMENT": "production",
    "DEBUG": "false"
}

print("[*] Starting Vercel Environment Variables Configuration...")

for key, val in env_vars.items():
    print(f"\n[~] Configuring {key}...")
    
    # Remove existing env var if present
    rm_cmd = ["vercel", "env", "rm", key, "production", "-y"]
    subprocess.run(rm_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)
    
    # Add new env var
    add_cmd = ["vercel", "env", "add", key, "production"]
    proc = subprocess.Popen(add_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
    stdout, stderr = proc.communicate(input=val)
    
    if proc.returncode == 0:
        print(f"[OK] Successfully configured {key}")
    else:
        print(f"[ERROR] Failed to configure {key}: {stderr.strip()}")

print("\n[*] Vercel Environment Variables Configuration Completed!")

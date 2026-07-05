# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Pre-Deployment Security Checklist

### Environment Variables (Vercel Environment)
```bash
# Generate new SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set these in Vercel dashboard → Settings → Environment Variables:

```env
ENVIRONMENT=production
DEBUG=false

# MongoDB Atlas connection (production database)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pcmt_exam?retryWrites=true&w=majority
DATABASE_NAME=pcmt_exam

# Security - CRITICAL - Generate new key!
SECRET_KEY=<your-32-character-random-key>
ALGORITHM=HS256

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS - Only production domain
CORS_ORIGINS=https://pcmt-ai-exam-system.vercel.app
CORS_ORIGIN_REGEX=https://pcmt-ai-exam-system\.vercel\.app

# Application
APP_NAME=PCMT Smart AI Exam System
APP_VERSION=1.0.0

# Security Features (all enabled)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_REGISTER=3/hour
CSRF_PROTECTION_ENABLED=true
SECURE_COOKIES=true
SAME_SITE_COOKIES=strict

# Database & Features
ALLOW_IN_MEMORY_DB=false
SEED_DEMO_DATA=false
PROCTORING_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/tmp/uploads
```

---

## Backend Deployment (Vercel or Docker)

### Option 1: Vercel Deployment

1. **Connect GitHub Repository**
   ```bash
   vercel link
   ```

2. **Configure Build Settings**
   - Framework: Other
   - Build Command: (leave empty - Python app)
   - Output Directory: (leave empty)
   - Root Directory: ./backend

3. **Add Environment Variables**
   - Use the environment variables listed above

4. **Deploy**
   ```bash
   vercel deploy --prod
   ```

### Option 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t pcmt-exam-backend:1.0 .
   ```

2. **Push to Registry**
   ```bash
   docker tag pcmt-exam-backend:1.0 <your-registry>/pcmt-exam-backend:1.0
   docker push <your-registry>/pcmt-exam-backend:1.0
   ```

3. **Deploy Container**
   ```bash
   docker run -d \
     --name pcmt-backend \
     -p 8000:8000 \
     -e MONGODB_URI="$MONGODB_URI" \
     -e SECRET_KEY="$SECRET_KEY" \
     -e ENVIRONMENT=production \
     -e DEBUG=false \
     <your-registry>/pcmt-exam-backend:1.0
   ```

---

## Frontend Deployment (Vercel)

1. **Connect Frontend Repository**
   ```bash
   cd frontend
   vercel link
   ```

2. **Configure Build Settings**
   - Framework: Vite
   - Build Command: npm run build
   - Output Directory: dist
   - Environment variables: (none needed for frontend)

3. **Update API Endpoint**
   In `vite.config.ts`:
   ```typescript
   export default defineConfig({
     define: {
       __API_URL__: '"https://pcmt-exam-api.vercel.app"'
     }
   })
   ```

4. **Deploy**
   ```bash
   vercel deploy --prod
   ```

---

## Nginx Configuration for HTTPS

```nginx
# /etc/nginx/sites-available/pcmt-exam

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name pcmt-ai-exam-system.vercel.app;
    return 301 https://$host$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pcmt-ai-exam-system.vercel.app;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/pcmt-ai-exam-system.vercel.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pcmt-ai-exam-system.vercel.app/privkey.pem;

    # Strong TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=()" always;

    # Logging
    access_log /var/log/nginx/pcmt_access.log combined;
    error_log /var/log/nginx/pcmt_error.log;

    # API Backend Proxy
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # WebSocket Proxy
    location /ws/ {
        proxy_pass http://backend:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        # Disable buffering for WebSocket
        proxy_buffering off;
    }

    # Frontend
    location / {
        root /app/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    location /api/auth/login {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://backend:8000;
    }

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://backend:8000;
    }
}
```

---

## Post-Deployment Verification

### 1. Health Checks
```bash
# API Health
curl -s https://pcmt-ai-exam-system.vercel.app/api/health | jq

# Database Connection
curl -s https://pcmt-ai-exam-system.vercel.app/api/system/stats -H "Authorization: Bearer $TOKEN"

# WebSocket (from browser console)
const ws = new WebSocket('wss://pcmt-ai-exam-system.vercel.app/ws/test-exam?token=' + token)
```

### 2. Security Verification

```bash
# Check SSL Certificate
curl -sI https://pcmt-ai-exam-system.vercel.app/ | grep -i "strict-transport"

# Verify security headers
curl -I https://pcmt-ai-exam-system.vercel.app/ | grep -E "X-|Content-Security|Referrer"

# Check CORS
curl -H "Origin: https://evil.com" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS https://pcmt-ai-exam-system.vercel.app/api/exams

# Test rate limiting
for i in {1..10}; do
  curl -X POST https://pcmt-ai-exam-system.vercel.app/api/auth/login \
    -d '{"email":"test@test.com","password":"test"}' &
done
```

### 3. Application Tests

```bash
# Login test
curl -X POST https://pcmt-ai-exam-system.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcmt.edu.in","password":"Admin@123456"}'

# Check logs
docker logs pcmt-backend | grep -E "ERROR|WARN"

# Monitor performance
watch -n 1 'curl -s https://pcmt-ai-exam-system.vercel.app/api/system/stats | jq .'
```

---

## Monitoring & Alerting

### 1. Application Monitoring
```bash
# View logs
docker logs -f pcmt-backend

# Specific log types
tail -f logs/error.log
tail -f logs/app.log | jq -r 'select(.level=="ERROR")'

# Count errors
grep '"level":"ERROR"' logs/app.log | wc -l
```

### 2. Database Monitoring
```bash
# MongoDB Atlas Dashboard
# - Check connection status
# - Monitor query performance
# - Review index usage
# - Set up alerts for slow queries

mongosh "mongodb+srv://cluster.mongodb.net/pcmt_exam" --apiVersion 1
db.getProfilingLevel()
db.setProfilingLevel(1, { slowms: 100 })
```

### 3. Uptime Monitoring
```bash
# UptimeRobot Configuration
- URL: https://pcmt-ai-exam-system.vercel.app/api/health
- Interval: 5 minutes
- Alert threshold: 2 failed checks
```

---

## Troubleshooting Production Issues

### Issue: WebSocket connections failing
**Solution:** Verify JWT token is being passed correctly
```typescript
// Check token format in browser console
const token = localStorage.getItem('access_token')
console.log('Token:', token.substring(0, 20) + '...')
// Try connecting with token
```

### Issue: Rate limiting blocking legitimate users
**Solution:** Adjust limits or whitelist IPs
```python
# In config.py
RATE_LIMIT_LOGIN="10/minute"  # Increase limit
RATE_LIMIT_REGISTER="5/hour"
```

### Issue: Database connection timeouts
**Solution:** Check MongoDB Atlas network access
```bash
# MongoDB Atlas → Network Access → Check IP whitelist
# Ensure production server IP is whitelisted
```

### Issue: High latency on queries
**Solution:** Check indexes and optimize queries
```bash
# Verify indexes exist
db.submissions.getIndexes()

# Add missing indexes
db.submissions.createIndex({ exam_id: 1, student_id: 1 })
```

---

## Regular Maintenance

### Weekly
- Review error logs
- Check database size
- Monitor application performance
- Verify backups

### Monthly
- Review security logs
- Update dependencies
- Test disaster recovery
- Review user access

### Quarterly
- Security audit
- Performance optimization
- Database optimization
- Capacity planning

---

## Rollback Procedure

If issues occur:

```bash
# Revert to previous version
vercel rollback

# Or manually
vercel deploy --prod
# Select previous build from history

# Verify rollback
curl https://pcmt-ai-exam-system.vercel.app/api/health
```

---

## Documentation

- [Security Improvements](./SECURITY_IMPROVEMENTS.md)
- [Environment Configuration](./.env.example)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)

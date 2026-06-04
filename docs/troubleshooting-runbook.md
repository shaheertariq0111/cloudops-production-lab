# Troubleshooting Runbook

## Project Name

CloudOps Production Simulation Lab

## Purpose

This runbook documents common operational issues faced during the deployment and how to diagnose and fix them.

The project stack includes:

```text
Browser → Nginx → Node.js/PM2 → Amazon RDS MySQL → Amazon S3 → CloudWatch
```

---

## 1. Quick Health Check

Run these inside EC2:

```bash
cd ~/cloudops-production-lab/app
pm2 status
curl http://localhost:3000/health
curl http://localhost/health
sudo systemctl status nginx --no-pager
sudo systemctl status amazon-cloudwatch-agent --no-pager
```

Expected:

```text
PM2 app: online
Nginx: active running
CloudWatch Agent: active running
Health endpoint: status OK
Database: connected
Environment: EC2-RDS
Image storage: S3
```

---

## 2. App Does Not Open in Browser

### Symptom

```text
http://EC2_PUBLIC_IP does not load
```

### Checks

Inside EC2:

```bash
curl http://localhost/health
sudo systemctl status nginx --no-pager
pm2 status
```

From AWS Console:

```text
EC2 → Security Groups → cloudops-ec2-sg → Inbound rules
```

Required inbound rules:

| Port | Source | Purpose |
|---|---|---|
| 22 | My IP | SSH |
| 80 | 0.0.0.0/0 | Public HTTP |

### Fix

Start Nginx:

```bash
sudo systemctl start nginx
```

Restart PM2 app:

```bash
pm2 restart cloudops-student-records --update-env
```

If port 80 is missing, add HTTP inbound rule in the EC2 security group.

---

## 3. App Opens on `:3000` But Not on Port 80

### Symptom

```text
http://EC2_PUBLIC_IP:3000 works
http://EC2_PUBLIC_IP does not work
```

### Cause

Nginx is not installed, not running, or reverse proxy config is broken.

### Checks

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
cat /etc/nginx/sites-available/cloudops-student-records
```

### Fix

Restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Correct Nginx config:

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. 502 Bad Gateway

### Symptom

Browser shows:

```text
502 Bad Gateway
nginx
```

### Meaning

Nginx is running, but Node.js is not responding on port 3000.

### Checks

```bash
pm2 status
curl http://localhost:3000/health
pm2 logs cloudops-student-records --lines 80
ss -tulpen | grep 3000
```

### Fix

Restart app:

```bash
cd ~/cloudops-production-lab/app
pm2 restart cloudops-student-records --update-env
```

If PM2 has no process:

```bash
pm2 start /home/ubuntu/cloudops-production-lab/app/server.js --name cloudops-student-records --cwd /home/ubuntu/cloudops-production-lab/app --update-env
pm2 save
```

---

## 5. PM2 App Is Errored

### Symptom

```bash
pm2 status
```

Shows:

```text
errored
```

### Check logs

```bash
pm2 logs cloudops-student-records --lines 100
```

### Common causes

| Error | Cause | Fix |
|---|---|---|
| Cannot find module | Missing npm package | Run `npm install` |
| Access denied for user | Wrong DB credentials | Fix `.env` |
| Unknown database | DB not created | Create/import database |
| S3 bucket not configured | Missing `.env` value | Add `S3_BUCKET_NAME` |
| Syntax error | Broken `server.js` | Run `node -c server.js` |

### Fix process

```bash
cd ~/cloudops-production-lab/app
npm install
node -c server.js
pm2 restart cloudops-student-records --update-env
```

---

## 6. Health Endpoint Fails

### Symptom

```bash
curl http://localhost:3000/health
```

Fails.

### Checks

```bash
pm2 status
pm2 logs cloudops-student-records --lines 80
cat .env
```

Do not expose `.env` publicly because it contains secrets.

Safe `.env` check:

```bash
grep -E "^(DB_HOST|DB_USER|DB_NAME|PORT|APP_ENV|AWS_REGION|S3_BUCKET_NAME)=" .env
```

Expected:

```text
DB_HOST=cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com
DB_USER=cloudopsadmin
DB_NAME=cloudops_students
PORT=3000
APP_ENV=EC2-RDS
AWS_REGION=us-east-1
S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602
```

---

## 7. RDS Connection Fails

### Symptom

Health endpoint fails or PM2 logs show database connection error.

### Checks

Inside EC2:

```bash
mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p
```

Check DNS:

```bash
nslookup cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com
getent hosts cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com
```

### Common errors

| Error | Meaning | Fix |
|---|---|---|
| Unknown MySQL server host | Wrong endpoint or DNS issue | Copy exact RDS endpoint |
| Access denied | Wrong username/password | Fix `.env` |
| Can't connect to MySQL server | Security group/subnet issue | Check RDS SG |
| Unknown database | Database missing | Create/import DB |

### Required RDS security group rule

| Type | Port | Source |
|---|---|---|
| MySQL/Aurora | 3306 | EC2 security group |

RDS must allow traffic from:

```text
cloudops-ec2-sg
```

not from public IP.

---

## 8. RDS DNS Endpoint Mistyped

### Symptom

```text
ERROR 2005 (HY000): Unknown MySQL server host
```

### Cause

Endpoint was typed incorrectly.

Example mistake:

```text
c2x4uv60qfx3
```

Correct endpoint:

```text
c2x4uy60qfx3
```

### Fix

Get endpoint again:

```powershell
aws rds describe-db-instances `
  --db-instance-identifier cloudops-rds-mysql `
  --query "DBInstances[0].Endpoint.Address" `
  --output text
```

Use the exact output.

---

## 9. S3 Upload Fails

### Symptom

Browser shows:

```text
Student upload error
```

### Check logs

```bash
pm2 logs cloudops-student-records --lines 80
```

Look for:

```text
Add student error:
```

### Common causes

| Error | Meaning | Fix |
|---|---|---|
| S3_BUCKET_NAME is not configured | Missing `.env` value | Add `S3_BUCKET_NAME` |
| AccessDenied | IAM role missing permission | Check EC2 IAM role |
| NoSuchBucket | Wrong bucket name | Fix `.env` |
| EntityTooLarge | File too large | Use smaller image |
| Cannot find module @aws-sdk/client-s3 | AWS SDK missing | Install package |

### Fix `.env`

```bash
cd ~/cloudops-production-lab/app

grep -q '^AWS_REGION=' .env && sed -i 's|^AWS_REGION=.*|AWS_REGION=us-east-1|' .env || echo 'AWS_REGION=us-east-1' >> .env

grep -q '^S3_BUCKET_NAME=' .env && sed -i 's|^S3_BUCKET_NAME=.*|S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602|' .env || echo 'S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602' >> .env
```

Restart:

```bash
pm2 restart cloudops-student-records --update-env
```

---

## 10. AWS SDK Module Missing

### Symptom

PM2 logs show:

```text
Cannot find module '@aws-sdk/client-s3'
```

### Fix

```bash
cd ~/cloudops-production-lab/app
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pm2 restart cloudops-student-records --update-env
```

---

## 11. S3 Upload Works But Image Does Not Display

### Checks

Check S3 object exists:

```bash
aws s3 ls s3://cloudops-student-images-shaheer-20260602/students/
```

Check app logs:

```bash
pm2 logs cloudops-student-records --lines 80
```

Check database record has image key:

```bash
mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p cloudops_students -e "SELECT id,name,image_key FROM students ORDER BY id DESC LIMIT 5;"
```

### Likely cause

Signed URL generation failed or image key was not saved correctly.

### Fix

Confirm `.env` has:

```text
AWS_REGION=us-east-1
S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602
```

Restart app:

```bash
pm2 restart cloudops-student-records --update-env
```

---

## 12. CloudWatch Logs Not Appearing

### Checks

CloudWatch Agent status:

```bash
sudo systemctl status amazon-cloudwatch-agent --no-pager
```

Agent config:

```bash
cat /opt/aws/amazon-cloudwatch-agent/bin/cloudops-config.json
```

Check IAM role:

```bash
aws sts get-caller-identity
```

The ARN should include:

```text
assumed-role/cloudops-ec2-s3-role
```

Check log groups:

```bash
aws logs describe-log-groups --log-group-name-prefix "/cloudops/student-records"
```

### Fix

Restart CloudWatch Agent:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-s \
-c file:/opt/aws/amazon-cloudwatch-agent/bin/cloudops-config.json
```

---

## 13. CloudWatch Metrics Not Visible

### Cause

CloudWatch custom metrics may take several minutes to appear.

### Checks

Generate activity:

```bash
curl http://localhost/
curl http://localhost/health
curl http://localhost/nonexistent-test-page
```

Check agent logs:

```bash
sudo journalctl -u amazon-cloudwatch-agent --no-pager | tail -50
```

### Expected namespace

```text
CloudOps/StudentRecords
```

---

## 14. SSH Fails After Restarting EC2

### Symptom

```text
Permission denied (publickey)
```

### Checks

Use correct key:

```powershell
ssh -i "$HOME\Documents\cloudops-production-lab\keys\cloudops-lab-key.pem" ubuntu@EC2_PUBLIC_IP
```

Correct username for Ubuntu:

```text
ubuntu
```

Check EC2 security group has:

| Port | Source |
|---|---|
| 22 | My IP |

### If public IP changed

Get new IP from:

```text
EC2 → Instances → cloudops-ec2-web → Public IPv4 address
```

---

## 15. SSH Host Authenticity Warning

### Symptom

```text
The authenticity of host cannot be established
```

### Cause

EC2 public IP changed after stop/start.

### Fix

If the fingerprint matches the same known host key, type:

```text
yes
```

This adds the new public IP to `known_hosts`.

---

## 16. Public IP Changed

### Cause

EC2 was stopped and started without Elastic IP.

### Fix

Update notes and use the new IP:

```text
http://NEW_PUBLIC_IP
```

SSH:

```powershell
ssh -i "$HOME\Documents\cloudops-production-lab\keys\cloudops-lab-key.pem" ubuntu@NEW_PUBLIC_IP
```

No need to change RDS endpoint.

---

## 17. App Still Shows Old UI

### Cause

Browser cache or PM2 running old code.

### Fix

Hard refresh browser:

```text
Ctrl + F5
```

Restart PM2:

```bash
pm2 restart cloudops-student-records --update-env
```

Check code running:

```bash
grep -n "appEnv\|environment\|imageStorage" server.js
```

---

## 18. Wrong Terminal Context

### Problem

Commands were run in Windows instead of EC2 or EC2 instead of Windows.

### Rule

```text
PS C:\Users\hp>                  = Windows laptop
ubuntu@ip-10-0-1-53:~$           = EC2 server
ubuntu@ip-10-0-1-53:~/app$       = EC2 app folder
```

### Examples

Run SSH from Windows:

```powershell
ssh -i "$HOME\Documents\cloudops-production-lab\keys\cloudops-lab-key.pem" ubuntu@EC2_PUBLIC_IP
```

Run Linux server commands inside EC2:

```bash
pm2 status
sudo systemctl status nginx
curl http://localhost/health
```

---

## 19. Git Shows `.env`, `.pem`, or `node_modules`

### Problem

Secrets or large dependency folders may be committed accidentally.

### Check

```powershell
git status
git ls-files | findstr /i ".env .pem node_modules"
```

Safe expected output:

```text
app/.env.example
```

### Fix `.gitignore`

```gitignore
app/node_modules/
app/.env
app/uploads/*
!app/uploads/.gitkeep
keys/
*.pem
*.zip
*.log
.DS_Store
/node_modules/
/package.json
/package-lock.json
```

If accidentally staged:

```bash
git restore --staged app/.env
git restore --staged keys/cloudops-lab-key.pem
git restore --staged app/node_modules/
```

---

## 20. Accidental Root `node_modules` or `package.json`

### Symptom

Git shows:

```text
node_modules/
package.json
package-lock.json
```

at project root.

### Cause

`npm install` was accidentally run in the root folder instead of `app/`.

### Fix

From Windows PowerShell:

```powershell
cd $HOME\Documents\cloudops-production-lab
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package.json, .\package-lock.json -ErrorAction SilentlyContinue
```

---

## 21. Cost Control Runbook

When stopping work:

```text
Stop EC2
Stop RDS
Do not terminate unless project is fully backed up
Do not delete S3 bucket unless screenshots/images are no longer needed
```

Before shutdown:

```bash
pm2 save
curl http://localhost/health
exit
```

After restart:

```text
Start RDS first
Wait until Available
Start EC2
Get new public IP
SSH into EC2
Check PM2, Nginx, CloudWatch Agent
```

---

## 22. Final Known Working Checks

Inside EC2:

```bash
cd ~/cloudops-production-lab/app

curl http://localhost:3000/health
curl http://localhost/health

pm2 status
sudo systemctl status nginx --no-pager
sudo systemctl status amazon-cloudwatch-agent --no-pager

aws s3 ls s3://cloudops-student-images-shaheer-20260602/students/

mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p cloudops_students -e "SELECT id, name, email, course, image_key, created_at FROM students ORDER BY id DESC LIMIT 5;"
```

Expected:

```text
App health OK
Database connected
Environment EC2-RDS
Image storage S3
PM2 online
Nginx active
CloudWatch Agent active
RDS query returns student records
S3 lists uploaded student images
```
```

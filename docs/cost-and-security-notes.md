# Cost and Security Notes

## Project Name

CloudOps Production Simulation Lab

## Purpose

This document records the cost-control and security decisions used in the AWS CloudOps Production Simulation Lab.

The project uses AWS resources such as EC2, RDS, S3, IAM, CloudWatch, VPC, subnets, route tables, and security groups. These resources can generate charges if left running. Security controls are also required because the project includes a public web application, private database, private object storage, and operational monitoring.

---

## 1. AWS Cost Control Summary

The main cost-generating resources in this project are:

| Resource | Cost Risk |
|---|---|
| EC2 instance | Charged while running |
| RDS MySQL instance | Charged while running |
| RDS storage | Charged while allocated |
| S3 storage | Charged for stored objects and requests |
| CloudWatch Logs | Charged for log ingestion and storage |
| CloudWatch Metrics | May charge for custom metrics |
| Data transfer | May charge depending on traffic |
| Snapshots/backups | May charge if retained |

The project intentionally avoided expensive services such as NAT Gateway, Load Balancer, and Elastic IP during the learning stage.

---

## 2. Budget Controls

AWS Budgets were created before deploying major resources.

Budget alerts used:

| Budget | Purpose |
|---|---|
| Zero Spend Budget | Alert when spending starts |
| Monthly Cost Budget | Alert when cost reaches defined thresholds |
| Emergency Budget | Alert if unexpected cost rises too high |

Budget alerts should be email-only for this project. Automated budget actions were avoided because they can accidentally block services or interrupt learning.

---

## 3. Daily Cost Management Procedure

When not actively working on the project:

```text
Stop EC2
Stop RDS
Do not terminate resources unless backed up
Keep S3 only if uploaded image evidence is still needed
Monitor AWS Billing dashboard
Check AWS Budgets alerts
```

Recommended shutdown order:

```text
1. Save PM2 process state
2. Verify health endpoint
3. Exit EC2
4. Stop EC2
5. Stop RDS
```

Commands before stopping EC2:

```bash
cd ~/cloudops-production-lab/app
pm2 save
curl http://localhost/health
exit
```

Start order when resuming:

```text
1. Start RDS
2. Wait until RDS status is Available
3. Start EC2
4. Copy new EC2 public IP
5. SSH into EC2
6. Check PM2, Nginx, CloudWatch Agent
7. Test app health endpoint
```

---

## 4. Cost-Saving Decisions Made

### EC2

A small EC2 instance was used for the application server.

Cost-saving decisions:

- Used one EC2 instance only
- Stopped EC2 when not working
- Avoided Auto Scaling Group during this phase
- Avoided Application Load Balancer during this phase
- Used Nginx directly on EC2 for reverse proxy

### RDS

A small RDS MySQL instance was used.

Cost-saving decisions:

- Single-AZ deployment
- No Multi-AZ standby
- No public access
- Minimal allocated storage
- Stopped RDS when not working
- Avoided unnecessary read replicas
- Backup retention kept minimal for learning stage

### S3

S3 was used only for student image uploads.

Cost-saving decisions:

- Stored only small test images
- Deleted unnecessary test objects
- Kept bucket private
- Avoided large media files
- Avoided public hosting from S3

### CloudWatch

CloudWatch Agent collects logs and custom metrics.

Cost-saving decisions:

- Collected only necessary logs
- Used limited custom metrics
- Avoided excessive high-frequency logging
- Generated test logs only when needed
- Screenshots taken after proof was confirmed

### Networking

The architecture avoided NAT Gateway.

Cost-saving decisions:

- No NAT Gateway
- No VPC endpoints during this phase
- No Application Load Balancer
- No Elastic IP unless a stable public IP becomes necessary

---

## 5. Security Summary

The project applied basic cloud security controls across compute, network, storage, database, and credentials.

Security priorities:

```text
Keep database private
Keep S3 bucket private
Do not commit secrets
Use IAM role instead of access keys on EC2
Restrict SSH access
Expose only required public ports
Monitor logs and health
```

---

## 6. Network Security

### EC2 Security Group

Allowed inbound traffic:

| Port | Source | Purpose |
|---|---|---|
| 22 | My IP | SSH administration |
| 80 | 0.0.0.0/0 | Public HTTP access through Nginx |

Port 3000 was used temporarily during testing and then removed from public access.

Final intended model:

```text
Public users → Port 80 only
Nginx → Internal Node.js app on port 3000
```

### RDS Security Group

Allowed inbound traffic:

| Port | Source | Purpose |
|---|---|---|
| 3306 | EC2 security group | MySQL access from Node.js app only |

RDS is not publicly accessible.

This means:

```text
Internet users cannot connect directly to RDS
Only the EC2 app security group can reach RDS on port 3306
```

---

## 7. Database Security

RDS MySQL was deployed in private subnets.

Security decisions:

- Public access disabled
- Private subnet group used
- MySQL inbound restricted to EC2 security group
- App credentials stored in `.env`
- `.env` excluded from Git
- RDS endpoint used through private VPC networking

Known limitation:

```text
The project uses a database password in an EC2 .env file.
```

Recommended future improvement:

```text
Move database credentials to AWS Secrets Manager or SSM Parameter Store.
```

---

## 8. S3 Security

Student images are stored in a private S3 bucket.

Security decisions:

- Block Public Access enabled
- ACLs disabled
- SSE-S3 encryption enabled
- No public bucket policy
- EC2 accesses bucket through IAM role
- App displays images using temporary signed URLs

This avoids exposing uploaded images publicly.

Final S3 access model:

```text
Node.js app → IAM role → Private S3 bucket
Browser → Temporary signed URL → Image object
```

---

## 9. IAM Security

The EC2 instance uses an IAM role.

Role purpose:

```text
Allow EC2 app to access S3 and CloudWatch without storing AWS keys on the server.
```

Policies attached:

- S3 access policy for the project bucket
- CloudWatchAgentServerPolicy

Security decisions:

- No AWS access keys stored in `.env`
- No AWS secret keys committed to Git
- EC2 uses temporary role credentials from instance metadata
- S3 permissions limited to the project bucket

Known limitation:

```text
The IAM role could be further reduced to stricter least-privilege CloudWatch permissions.
```

---

## 10. Secrets Management

Sensitive files excluded from Git:

```text
app/.env
keys/
*.pem
node_modules/
```

Safe file included:

```text
app/.env.example
```

The `.env.example` file must contain placeholders only:

```env
DB_HOST=replace_with_database_host
DB_USER=replace_with_database_user
DB_PASSWORD=replace_with_database_password
DB_NAME=cloudops_students
PORT=3000
APP_ENV=replace_with_environment
AWS_REGION=us-east-1
S3_BUCKET_NAME=replace_with_s3_bucket_name
```

Verification command:

```powershell
git ls-files | findstr /i ".env .pem node_modules"
```

Safe expected output:

```text
app/.env.example
```

---

## 11. SSH Key Security

The EC2 private key is stored locally in:

```text
keys/cloudops-lab-key.pem
```

Security decisions:

- Key file excluded from Git
- SSH inbound restricted to user's IP
- Key permissions fixed locally
- Key not shared or uploaded

If the key is exposed:

```text
Immediately remove the key pair from AWS
Create a new key pair
Replace EC2 access method
Rotate any affected credentials
```

---

## 12. Application Security

Basic controls used:

- Form input required fields
- Image file upload size limit
- Private image storage in S3
- App runs behind Nginx
- PM2 keeps app stable
- Health endpoint verifies service status

Known limitations:

- No HTTPS yet
- No authentication system
- No user authorization
- No rate limiting
- No WAF
- No input sanitization beyond basic handling
- No malware scanning for uploads
- No production-grade secret manager yet

Future improvements:

- Add HTTPS
- Add authentication
- Add file type validation
- Add upload scanning
- Add rate limiting
- Add WAF
- Move credentials to Secrets Manager
- Add CloudWatch alarms

---

## 13. Monitoring and Logging Security

CloudWatch collects:

- PM2 application logs
- PM2 error logs
- Nginx access logs
- Nginx error logs
- Memory usage
- Disk usage

Security benefit:

```text
Operational issues can be detected from logs instead of guessing.
```

Cost risk:

```text
CloudWatch logs and custom metrics can create cost if logs grow too much.
```

Controls:

- Keep log collection scoped
- Avoid excessive debug logs
- Review log retention settings
- Delete unnecessary log groups when project ends

Recommended future improvement:

```text
Set CloudWatch log retention period, such as 7 or 14 days, for lab cost control.
```

---

## 14. Public Exposure Review

Publicly exposed:

```text
HTTP port 80 on EC2
```

Restricted:

```text
SSH port 22 to My IP
Node.js port 3000 not publicly exposed
RDS port 3306 only from EC2 security group
S3 bucket private
```

Not exposed:

```text
RDS public endpoint access
S3 public bucket access
AWS credentials
Private key file
.env file
```

---

## 15. Stop and Start Runbook

### Before stopping work

Inside EC2:

```bash
cd ~/cloudops-production-lab/app
pm2 save
curl http://localhost/health
exit
```

In AWS Console:

```text
Stop EC2
Stop RDS
```

### When resuming

```text
Start RDS first
Wait for Available
Start EC2
Copy new EC2 public IP
SSH into EC2
Check services
```

Inside EC2:

```bash
pm2 status
sudo systemctl status nginx --no-pager
sudo systemctl status amazon-cloudwatch-agent --no-pager
curl http://localhost/health
```

---

## 16. Resource Cleanup Plan

When the project is finished and no longer needed:

1. Take final screenshots
2. Export final database if needed
3. Download any required S3 objects
4. Delete RDS instance if no longer needed
5. Delete RDS snapshots if not needed
6. Delete EC2 instance
7. Delete S3 objects and bucket
8. Delete CloudWatch log groups
9. Delete IAM role and custom policies
10. Delete unused security groups
11. Delete unused subnets, route tables, internet gateway, and VPC

Do not delete anything before confirming that the project has been committed and documented.

---

## 17. Current Security Posture

| Area | Status |
|---|---|
| RDS private access | Implemented |
| S3 private bucket | Implemented |
| IAM role for EC2 | Implemented |
| No AWS keys in app | Implemented |
| `.env` ignored by Git | Implemented |
| Nginx reverse proxy | Implemented |
| Port 3000 public access removed | Implemented |
| CloudWatch monitoring | Implemented |
| HTTPS | Not implemented |
| Secrets Manager | Not implemented |
| WAF | Not implemented |
| CI/CD | Not implemented |

---

## 18. Final Notes

This project is a controlled learning and portfolio environment. It demonstrates strong junior cloud engineering fundamentals but is not a full production-grade system yet.

The strongest security decisions are:

```text
Private RDS
Private S3
IAM role-based access
Security group isolation
No committed secrets
CloudWatch visibility
```

The strongest cost-control decisions are:

```text
No NAT Gateway
No Load Balancer
Single small EC2
Single-AZ RDS
Manual stop/start routine
AWS Budget alerts
```
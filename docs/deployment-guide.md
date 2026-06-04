# Deployment Guide

## Project Name

CloudOps Production Simulation Lab

## Purpose

This guide explains how the student records application was deployed from a local development environment to AWS using EC2, Nginx, PM2, Amazon RDS MySQL, Amazon S3, IAM roles, and CloudWatch.

The guide is written as a deployment record and can be used to rebuild or explain the project.

---

## Final Deployment Architecture

```text
User Browser
   ↓
EC2 Public IP - Port 80
   ↓
Nginx Reverse Proxy
   ↓
Node.js Express App - Port 3000
   ↓
Amazon RDS MySQL
   ↓
Amazon S3 Private Bucket
   ↓
Amazon CloudWatch Logs and Metrics
```

---

## Prerequisites

The following tools and accounts are required:

- AWS account
- AWS CLI configured locally
- Git
- Node.js and npm
- MySQL client
- SSH key pair for EC2
- Windows PowerShell or terminal
- Basic Linux command-line access

---

## Local Application Setup

### 1. Create project structure

```bash
cloudops-production-lab/
  app/
  docs/
  infra/
  keys/
```

### 2. Install Node.js dependencies

```bash
cd app
npm install express mysql2 dotenv ejs multer
npm install --save-dev nodemon
```

Later, S3 support was added:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 3. Create local MySQL database

```sql
CREATE DATABASE cloudops_students;

USE cloudops_students;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  course VARCHAR(100) NOT NULL,
  image_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Create local `.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=replace_with_local_mysql_password
DB_NAME=cloudops_students
PORT=3000
APP_ENV=Local
AWS_REGION=us-east-1
S3_BUCKET_NAME=replace_with_s3_bucket_name
```

The `.env` file must not be committed to Git.

---

## Git Setup

### 1. Initialize Git

```bash
git init
```

### 2. Add `.gitignore`

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
```

### 3. Commit local app

```bash
git add .
git commit -m "Build local student records app with MySQL"
```

---

## AWS Networking Setup

### 1. Create VPC

```text
Name: cloudops-vpc
CIDR: 10.0.0.0/16
Region: us-east-1
```

### 2. Create public subnet for EC2

```text
Name: cloudops-public-subnet-1a
CIDR: 10.0.1.0/24
AZ: us-east-1a
```

Enable:

```text
Auto-assign public IPv4
```

### 3. Create Internet Gateway

```text
Name: cloudops-igw
Attach to: cloudops-vpc
```

### 4. Create public route table

```text
Name: cloudops-public-rt
Route:
0.0.0.0/0 → Internet Gateway
```

Associate the route table with the public subnet.

---

## EC2 Deployment

### 1. Create EC2 key pair

```text
Name: cloudops-lab-key
Type: RSA
Format: .pem
```

Store it in:

```text
keys/cloudops-lab-key.pem
```

Do not commit this file.

### 2. Create EC2 security group

```text
Name: cloudops-ec2-sg
VPC: cloudops-vpc
```

Inbound rules:

| Type | Port | Source |
|---|---:|---|
| SSH | 22 | My IP |
| HTTP | 80 | Anywhere IPv4 |

Port 3000 was temporarily opened during testing but later removed after Nginx was configured.

### 3. Launch EC2 instance

```text
Name: cloudops-ec2-web
AMI: Ubuntu Server 24.04 LTS
Instance type: t3.micro
Subnet: cloudops-public-subnet-1a
Security group: cloudops-ec2-sg
Storage: 8GB gp3
```

### 4. SSH into EC2

```bash
ssh -i "keys/cloudops-lab-key.pem" ubuntu@EC2_PUBLIC_IP
```

---

## EC2 Server Setup

### 1. Update packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install required tools

```bash
sudo apt install -y nodejs npm git mysql-server unzip nginx
```

### 3. Install PM2

```bash
sudo npm install -g pm2
```

---

## Initial EC2 MySQL Setup

Before RDS migration, MySQL was installed locally on EC2.

### 1. Start MySQL

```bash
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. Create database and app user

```sql
CREATE DATABASE cloudops_students;

USE cloudops_students;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  course VARCHAR(100) NOT NULL,
  image_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE USER 'cloudops_app'@'localhost' IDENTIFIED BY 'replace_with_password';
GRANT ALL PRIVILEGES ON cloudops_students.* TO 'cloudops_app'@'localhost';
FLUSH PRIVILEGES;
```

---

## Upload App to EC2

### 1. Create deployment zip locally

From Windows PowerShell:

```powershell
Compress-Archive -Path app\server.js, app\package.json, app\package-lock.json, app\views, app\public, app\uploads, app\.env.example -DestinationPath app-deploy.zip -Force
```

### 2. Copy zip to EC2

```powershell
scp -i "keys/cloudops-lab-key.pem" app-deploy.zip ubuntu@EC2_PUBLIC_IP:/home/ubuntu/
```

### 3. Unzip on EC2

```bash
mkdir -p ~/cloudops-production-lab/app
unzip -o app-deploy.zip -d ~/cloudops-production-lab/app
cd ~/cloudops-production-lab/app
npm install
```

### 4. Create EC2 `.env`

```env
DB_HOST=localhost
DB_USER=cloudops_app
DB_PASSWORD=replace_with_database_password
DB_NAME=cloudops_students
PORT=3000
APP_ENV=EC2
AWS_REGION=us-east-1
S3_BUCKET_NAME=replace_with_s3_bucket_name
```

---

## PM2 Setup

### 1. Start app with PM2

```bash
cd ~/cloudops-production-lab/app
pm2 start server.js --name cloudops-student-records
pm2 status
```

### 2. Save PM2 process

```bash
pm2 save
```

### 3. Enable startup

```bash
pm2 startup systemd
```

PM2 prints a command beginning with:

```bash
sudo env PATH=...
```

Copy and run that command.

Then run:

```bash
pm2 save
```

---

## Nginx Reverse Proxy Setup

### 1. Create Nginx config

```bash
sudo tee /etc/nginx/sites-available/cloudops-student-records > /dev/null <<'EOF'
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
EOF
```

### 2. Enable site

```bash
sudo ln -sf /etc/nginx/sites-available/cloudops-student-records /etc/nginx/sites-enabled/cloudops-student-records
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Test

```bash
curl http://localhost/health
```

Public browser URL:

```text
http://EC2_PUBLIC_IP
```

---

## S3 Setup

### 1. Create private S3 bucket

```text
Bucket name: cloudops-student-images-shaheer-20260602
Region: us-east-1
Block Public Access: Enabled
Object Ownership: ACLs disabled
Encryption: SSE-S3
```

### 2. Create IAM policy for S3

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListCloudOpsStudentImagesBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::cloudops-student-images-shaheer-20260602"
    },
    {
      "Sid": "ManageCloudOpsStudentImageObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::cloudops-student-images-shaheer-20260602/*"
    }
  ]
}
```

Policy name:

```text
cloudops-student-images-s3-policy
```

### 3. Create EC2 IAM role

```text
Role name: cloudops-ec2-s3-role
Trusted entity: EC2
Attached policy: cloudops-student-images-s3-policy
```

### 4. Attach role to EC2

```text
EC2 → Instance → Actions → Security → Modify IAM role
```

Attach:

```text
cloudops-ec2-s3-role
```

### 5. Test S3 access from EC2

```bash
aws sts get-caller-identity

echo "s3 test from ec2" > s3-test.txt
aws s3 cp s3-test.txt s3://cloudops-student-images-shaheer-20260602/test/s3-test.txt
aws s3 ls s3://cloudops-student-images-shaheer-20260602/test/
aws s3 rm s3://cloudops-student-images-shaheer-20260602/test/s3-test.txt
```

---

## App Update for S3

The application was updated to:

- Use AWS SDK for JavaScript v3
- Upload images to S3
- Store only S3 object keys in MySQL
- Generate temporary signed URLs for image display
- Delete S3 image objects when student records are deleted

Required packages:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Required `.env` values:

```env
AWS_REGION=us-east-1
S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602
```

Restart app:

```bash
pm2 restart cloudops-student-records --update-env
```

Validate:

```bash
curl http://localhost/health
aws s3 ls s3://cloudops-student-images-shaheer-20260602/students/
```

---

## RDS Network Setup

### 1. Create private RDS subnets

```text
cloudops-rds-private-subnet-a
CIDR: 10.0.2.0/24
AZ: us-east-1a

cloudops-rds-private-subnet-b
CIDR: 10.0.3.0/24
AZ: us-east-1b
```

### 2. Create private route table

```text
Name: cloudops-rds-private-rt
Route: 10.0.0.0/16 → local
```

No internet route was added.

### 3. Create RDS security group

```text
Name: cloudops-rds-sg
Inbound:
MySQL 3306 from cloudops-ec2-sg only
```

### 4. Create DB subnet group

```text
Name: cloudops-rds-subnet-group
Subnets:
- cloudops-rds-private-subnet-a
- cloudops-rds-private-subnet-b
```

---

## RDS Instance Setup

### 1. Create RDS MySQL instance

```text
DB identifier: cloudops-rds-mysql
Engine: MySQL
Instance class: db.t3.micro
Storage: 20GB
Public access: No
Multi-AZ: No
Subnet group: cloudops-rds-subnet-group
Security group: cloudops-rds-sg
Database name: cloudops_students
```

### 2. Get RDS endpoint

```powershell
aws rds describe-db-instances `
  --db-instance-identifier cloudops-rds-mysql `
  --query "DBInstances[0].Endpoint.Address" `
  --output text
```

### 3. Test RDS DNS and connection from EC2

```bash
RDS_ENDPOINT="cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com"

nslookup $RDS_ENDPOINT
getent hosts $RDS_ENDPOINT

mysql -h $RDS_ENDPOINT -u cloudopsadmin -p
```

---

## Database Migration to RDS

### 1. Dump local EC2 MySQL database

```bash
mysqldump -u cloudops_app -p cloudops_students > cloudops_students_backup.sql
```

### 2. Import into RDS

```bash
mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p cloudops_students < cloudops_students_backup.sql
```

### 3. Verify RDS data

```bash
mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p cloudops_students -e "SELECT id, name, email, course, image_key, created_at FROM students ORDER BY id DESC LIMIT 5;"
```

---

## Update App to Use RDS

Update `app/.env` on EC2:

```env
DB_HOST=cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com
DB_USER=cloudopsadmin
DB_PASSWORD=replace_with_rds_password
DB_NAME=cloudops_students
PORT=3000
APP_ENV=EC2-RDS
AWS_REGION=us-east-1
S3_BUCKET_NAME=cloudops-student-images-shaheer-20260602
```

Restart app:

```bash
pm2 restart cloudops-student-records --update-env
```

Validate:

```bash
curl http://localhost:3000/health
curl http://localhost/health
```

Expected:

```json
{
  "status": "OK",
  "service": "cloudops-student-records",
  "database": "connected",
  "environment": "EC2-RDS",
  "imageStorage": "S3",
  "bucket": "cloudops-student-images-shaheer-20260602"
}
```

---

## CloudWatch Setup

### 1. Attach CloudWatch Agent policy to EC2 role

```powershell
aws iam attach-role-policy --role-name cloudops-ec2-s3-role --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

### 2. Install CloudWatch Agent on EC2

```bash
cd /tmp
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

### 3. Add CloudWatch config

Stored in repo at:

```text
infra/cloudwatch/cloudops-config.json
```

### 4. Start CloudWatch Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-s \
-c file:/opt/aws/amazon-cloudwatch-agent/bin/cloudops-config.json
```

### 5. Check status

```bash
sudo systemctl status amazon-cloudwatch-agent --no-pager
```

### 6. Validate log groups

```bash
aws logs describe-log-groups --log-group-name-prefix "/cloudops/student-records"
```

Expected:

```text
/cloudops/student-records/app
/cloudops/student-records/nginx
```

---

## Final Validation Commands

### App health

```bash
curl http://localhost/health
```

### PM2

```bash
pm2 status
```

### Nginx

```bash
sudo systemctl status nginx --no-pager
```

### CloudWatch Agent

```bash
sudo systemctl status amazon-cloudwatch-agent --no-pager
```

### RDS query

```bash
mysql -h cloudops-rds-mysql.c2x4uy60qfx3.us-east-1.rds.amazonaws.com -u cloudopsadmin -p cloudops_students -e "SELECT id, name, email, course, image_key, created_at FROM students ORDER BY id DESC LIMIT 5;"
```

### S3 objects

```bash
aws s3 ls s3://cloudops-student-images-shaheer-20260602/students/
```

---

## Deployment Result

The final deployment provides:

- Public HTTP app access through Nginx
- Node.js app managed by PM2
- Private RDS MySQL database
- Private S3 image storage
- IAM role-based AWS access
- CloudWatch logs and metrics
- Health check endpoint
- Git-tracked documentation and screenshots

---

## Cleanup Notes

To reduce AWS cost when not working:

```text
Stop EC2
Stop RDS
Keep S3 bucket only if screenshots/images are needed
Avoid NAT Gateway
Avoid Elastic IP unless required
Monitor AWS Budgets
```

Do not terminate or delete resources unless the project is fully completed or backed up.
# Architecture Documentation

## Project Name

CloudOps Production Simulation Lab

## Architecture Overview

This project is a production-style AWS deployment of a student records web application. The system is designed to demonstrate practical cloud engineering skills across compute, networking, storage, database, monitoring, security, and operations.

The application is deployed on an EC2 Ubuntu server. Public HTTP traffic reaches Nginx on port 80. Nginx forwards requests to a Node.js Express application running internally on port 3000. The application stores structured student records in Amazon RDS MySQL and stores uploaded student images in a private Amazon S3 bucket. CloudWatch collects application logs, Nginx logs, memory metrics, and disk metrics.

## High-Level Architecture

```text
User Browser
   ↓
EC2 Public IP - Port 80
   ↓
Nginx Reverse Proxy
   ↓
Node.js Express Application - Port 3000
   ↓
Amazon RDS MySQL - Private Subnets
   ↓
Amazon S3 - Private Student Image Storage
   ↓
Amazon CloudWatch - Logs and Metrics
```

## Final Architecture Components

| Component | Purpose |
|---|---|
| Amazon EC2 | Hosts the application server |
| Ubuntu Linux | Operating system for the EC2 instance |
| Nginx | Reverse proxy for public HTTP traffic |
| Node.js + Express | Backend application runtime |
| PM2 | Keeps the Node.js app running in the background |
| Amazon RDS MySQL | Managed relational database |
| Amazon S3 | Private object storage for uploaded student images |
| IAM Role | Allows EC2 to access S3 and CloudWatch securely |
| CloudWatch Agent | Sends logs and metrics to CloudWatch |
| VPC | Isolated AWS network |
| Public Subnet | Hosts EC2 web server |
| Private Subnets | Host RDS database |
| Security Groups | Control traffic between EC2, RDS, and users |

## Network Architecture

The project uses a custom VPC with CIDR block:

```text
10.0.0.0/16
```

### Subnet Design

| Subnet | Purpose | CIDR | Availability Zone |
|---|---|---|---|
| Public subnet | EC2 web server | 10.0.1.0/24 | us-east-1a |
| Private RDS subnet A | RDS subnet group | 10.0.2.0/24 | us-east-1a |
| Private RDS subnet B | RDS subnet group | 10.0.3.0/24 | us-east-1b |

The EC2 instance is placed in the public subnet because it needs internet access for browser traffic and SSH administration.

The RDS instance is placed in private subnets because the database should not be directly accessible from the internet.

## Route Table Design

### Public Route Table

The public subnet is associated with a route table that includes:

```text
10.0.0.0/16 → local
0.0.0.0/0  → Internet Gateway
```

This allows the EC2 instance to receive public HTTP traffic and outbound internet access.

### Private RDS Route Table

The private RDS subnets are associated with a route table that only includes:

```text
10.0.0.0/16 → local
```

There is no internet route for the RDS private subnets. This helps keep the database isolated.

## Security Group Design

### EC2 Security Group

The EC2 security group allows:

| Port | Source | Purpose |
|---|---|---|
| 22 | My IP | SSH administration |
| 80 | 0.0.0.0/0 | Public HTTP access through Nginx |

Port 3000 was used temporarily during testing but should not remain publicly exposed after Nginx is configured.

### RDS Security Group

The RDS security group allows:

| Port | Source | Purpose |
|---|---|---|
| 3306 | EC2 security group | MySQL access from application server only |

RDS does not allow public internet access.

## Application Flow

### Student Record Creation

```text
User submits form
   ↓
Nginx receives HTTP request
   ↓
Nginx forwards request to Node.js app on port 3000
   ↓
Node.js validates form data
   ↓
Image is uploaded to private S3 bucket
   ↓
S3 object key is stored in RDS MySQL
   ↓
User is redirected to dashboard
```

### Student List Display

```text
User opens app dashboard
   ↓
Node.js queries RDS MySQL for student records
   ↓
For each image key, Node.js generates a temporary signed S3 URL
   ↓
EJS renders student table
   ↓
Browser displays private S3 images using signed URLs
```

### Student Deletion

```text
User clicks delete
   ↓
Node.js finds student image key in RDS
   ↓
Node.js deletes image object from S3
   ↓
Node.js deletes student record from RDS
   ↓
Dashboard refreshes
```

## Database Architecture

The application originally used local MySQL on the EC2 instance. It was later migrated to Amazon RDS MySQL.

### RDS Design

| Setting | Value |
|---|---|
| Engine | MySQL |
| Deployment | Single-AZ |
| Public access | Disabled |
| Subnet group | Private RDS subnets |
| Security group | Allows MySQL only from EC2 SG |
| Database name | cloudops_students |

### Students Table

```sql
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  course VARCHAR(100) NOT NULL,
  image_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## S3 Architecture

Student images are stored in a private S3 bucket.

### S3 Design

| Setting | Value |
|---|---|
| Bucket access | Private |
| Block Public Access | Enabled |
| Object ownership | ACLs disabled |
| Encryption | SSE-S3 |
| Access method | EC2 IAM role |
| Image display | Pre-signed URLs |

The application does not make the bucket public. Instead, it generates temporary signed URLs for image display.

## IAM Design

The EC2 instance uses an IAM role instead of hardcoded AWS credentials.

The role allows:

- Uploading images to the S3 bucket
- Reading private S3 images
- Deleting S3 objects
- Writing CloudWatch logs and metrics

This avoids storing AWS access keys inside the application.

## Monitoring Architecture

CloudWatch Agent is installed on EC2.

It collects:

| Source | Destination |
|---|---|
| PM2 output log | CloudWatch Logs |
| PM2 error log | CloudWatch Logs |
| Nginx access log | CloudWatch Logs |
| Nginx error log | CloudWatch Logs |
| Memory usage | CloudWatch Metrics |
| Disk usage | CloudWatch Metrics |

Custom metrics namespace:

```text
CloudOps/StudentRecords
```

Log groups:

```text
/cloudops/student-records/app
/cloudops/student-records/nginx
```

## Runtime Architecture

The Node.js application is managed by PM2.

PM2 provides:

- Background process execution
- Restart on crash
- Process status visibility
- Log management
- Startup persistence after reboot

Nginx provides:

- Public HTTP entry point
- Reverse proxy to Node.js
- Separation between public port 80 and internal app port 3000

## Health Check

The application exposes a health endpoint:

```text
/health
```

Expected production response:

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

This verifies that the app is running, the database connection is active, and S3 storage is configured.

## Final Production Path

```text
Browser
  → EC2 Public IP
  → Nginx Port 80
  → Node.js App Port 3000
  → Amazon RDS MySQL
  → Amazon S3 Private Bucket
  → CloudWatch Logs and Metrics
```

## Architecture Benefits

This architecture demonstrates:

- Separation of compute, database, and storage
- Private database deployment
- Private object storage
- IAM role-based access
- Reverse proxy design
- Process management
- Centralized monitoring
- Cloud troubleshooting and validation
- Production-style deployment pattern

## Known Limitations

This project is intentionally designed as a learning and portfolio lab. Current limitations include:

- Single EC2 instance, no Auto Scaling Group
- Single-AZ RDS deployment
- No HTTPS certificate yet
- No domain name yet
- No CI/CD pipeline yet
- No infrastructure-as-code implementation yet
- No automated backup restore testing yet

These limitations can be addressed in future project phases.

## Future Improvements

Possible future upgrades:

- Add HTTPS using ACM and an Application Load Balancer
- Add a domain name with Route 53
- Add Auto Scaling Group
- Add CI/CD pipeline using GitHub Actions
- Convert infrastructure to Terraform
- Add RDS automated backup validation
- Add CloudWatch alarms
- Add centralized error dashboard
- Add WAF for basic web protection
# Resume and LinkedIn Bullet Set

## Project Title

CloudOps Production Simulation Lab

## One-Line Resume Version

Built and deployed a production-style AWS CloudOps lab using EC2, Nginx, Node.js, PM2, Amazon RDS MySQL, private S3 image storage, IAM roles, security groups, and CloudWatch monitoring.

## Strong Resume Bullets

- Built and deployed a production-style student records application on AWS using EC2, Nginx, Node.js, PM2, Amazon RDS MySQL, Amazon S3, IAM roles, security groups, and CloudWatch.

- Designed a custom AWS VPC with public and private subnets, route tables, Internet Gateway, EC2 security group, RDS private subnet group, and database security group to isolate public web access from private database access.

- Migrated the application database from local MySQL on EC2 to private Amazon RDS MySQL and validated connectivity using MySQL client queries, environment variables, and application health checks.

- Implemented private Amazon S3 image storage using IAM role-based access, AWS SDK for JavaScript, object keys stored in MySQL, and temporary signed URLs for secure image display.

- Configured Nginx as a reverse proxy to expose the application on port 80 while keeping the Node.js runtime internal on port 3000.

- Used PM2 to run the Node.js application as a managed background process with restart persistence after EC2 reboot.

- Installed and configured CloudWatch Agent to collect PM2 logs, Nginx logs, memory usage, and disk usage into CloudWatch Logs and custom metrics.

- Created troubleshooting documentation covering 502 errors, PM2 failures, RDS connection issues, S3 upload errors, CloudWatch agent problems, SSH issues, and Git secret-safety checks.

- Applied basic cloud security controls including private RDS deployment, private S3 bucket access, IAM role-based AWS access, restricted SSH, security group isolation, and exclusion of secrets from Git.

## Short LinkedIn Project Description

Built a production-style AWS CloudOps lab to demonstrate junior cloud engineering skills. The project deploys a Node.js student records app on EC2 behind Nginx, uses PM2 for process management, stores records in private Amazon RDS MySQL, stores uploaded images in a private S3 bucket using signed URLs, and sends logs/metrics to CloudWatch. The project includes architecture documentation, deployment guide, troubleshooting runbook, cost/security notes, and validation screenshots.

## GitHub Repository Description

Production-style AWS CloudOps lab using EC2, Nginx, Node.js, PM2, RDS MySQL, private S3 image storage, IAM roles, security groups, and CloudWatch monitoring.

## Skills Demonstrated

- AWS EC2
- Amazon RDS MySQL
- Amazon S3
- Amazon CloudWatch
- AWS IAM
- Amazon VPC
- Security Groups
- Linux server administration
- Nginx reverse proxy
- PM2 process management
- Node.js deployment
- MySQL database migration
- S3 signed URLs
- Cloud monitoring
- Troubleshooting
- Git documentation

## Interview Explanation

This project simulates a real cloud operations environment. I started by building a local Node.js and MySQL application, then deployed it to EC2. I configured Nginx as a reverse proxy, used PM2 to manage the Node.js process, moved uploaded images to a private S3 bucket, migrated the database from local MySQL to private Amazon RDS MySQL, and added CloudWatch monitoring for logs and system metrics. I also documented the architecture, deployment process, troubleshooting steps, cost controls, and security decisions.
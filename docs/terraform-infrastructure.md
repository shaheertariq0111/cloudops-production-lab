# Terraform Infrastructure Automation

## Purpose

This document explains the Terraform Infrastructure as Code version of the CloudOps Production Simulation Lab.

Project 1 was built manually on AWS. Project 2 rebuilds the core AWS infrastructure using Terraform so it can be version-controlled, reviewed, recreated, and destroyed safely.

## Region

us-east-1

## Terraform Folder

terraform/

Main files:

- versions.tf: Terraform and provider versions
- providers.tf: AWS provider and default tags
- variables.tf: reusable input values
- main.tf: VPC, subnets, route tables, security groups, S3, IAM
- ec2.tf: EC2 instance and user data
- rds.tf: RDS MySQL database
- outputs.tf: useful output values
- terraform.tfvars.example: safe example variables

## Terraform-Managed Resources

- VPC
- Public subnet
- Two private subnets
- Internet Gateway
- Public and private route tables
- EC2 security group
- RDS security group
- Private S3 bucket
- S3 public access block
- S3 encryption
- S3 ownership controls
- EC2 IAM role
- EC2 IAM policy for S3 access
- IAM instance profile
- Ubuntu EC2 instance
- Private RDS MySQL instance

## Architecture Summary

Internet traffic reaches the EC2 instance through HTTP port 80.

SSH access is restricted to the admin public IP only.

The EC2 instance accesses S3 through an IAM role.

The RDS MySQL database is placed in private subnets and is not publicly accessible.

Only the EC2 security group can connect to RDS on MySQL port 3306.

## Security Notes

The following files must not be committed:

- terraform/terraform.tfvars
- terraform/*.tfstate
- terraform/*.tfstate.*
- keys/
- *.pem
- .env

Database passwords are stored only in the ignored local terraform.tfvars file.

The EC2 private key is stored only locally in the keys/ folder.

## Cost Control

This Terraform version avoids:

- NAT Gateway
- Load Balancer
- EKS
- Multi-AZ RDS
- Performance Insights

Main running cost risks:

- EC2 instance
- RDS MySQL instance
- RDS storage
- EBS volume
- S3 storage

Destroy resources when not needed.

## Main Terraform Commands

Run from the terraform/ folder:

terraform init
terraform fmt
terraform validate
terraform plan
terraform apply

Safer apply workflow:

terraform plan -out=tfplan
terraform apply tfplan

## Verification Commands

Check Terraform state:

terraform state list
terraform output
terraform plan

Expected drift result:

No changes. Your infrastructure matches the configuration.

Check EC2 health:

curl.exe http://<EC2_PUBLIC_IP>/health

Expected:

ok

SSH to EC2:

ssh -i "keys\cloudops-terraform-key.pem" ubuntu@<EC2_PUBLIC_IP>

Test EC2 IAM role inside EC2:

aws sts get-caller-identity

Expected ARN contains:

assumed-role/cloudops-terraform-lab-dev-ec2-role

Test S3 from EC2:

aws s3 cp test.txt s3://<S3_BUCKET_NAME>/test/test.txt
aws s3 ls s3://<S3_BUCKET_NAME>/test/
aws s3 rm s3://<S3_BUCKET_NAME>/test/test.txt

Test RDS from EC2:

mysql -h <RDS_PRIVATE_ENDPOINT> -u cloudadmin -p studentrecords

## Cleanup

Only run this when intentionally removing Terraform-managed Project 2 resources:

terraform plan -destroy
terraform destroy

This removes the Terraform-managed EC2, RDS, S3, IAM, security groups, subnets, route tables, internet gateway, and VPC.

## Current Status

Terraform successfully created and verified:

- VPC networking
- Public and private subnets
- Security groups
- Private S3 bucket
- EC2 IAM role and S3 policy
- Ubuntu EC2 with Nginx
- Private RDS MySQL
- EC2-to-S3 access through IAM
- EC2-to-RDS private connectivity

## Final Verification and Cleanup Status

The Terraform-managed AWS infrastructure was successfully created, tested, verified, documented, and screenshotted.

Verified components included:

- VPC networking
- Public and private subnets
- Route tables and internet gateway
- EC2 security group and RDS security group
- Private S3 bucket with public access blocked
- EC2 IAM role and S3 access policy
- Ubuntu EC2 instance with Nginx
- Private RDS MySQL database
- EC2-to-S3 access through IAM role
- EC2-to-RDS private MySQL connectivity

After verification, the Terraform-managed stack was destroyed for cost control. The Terraform code remains in the repository and can recreate the infrastructure using `terraform apply`.

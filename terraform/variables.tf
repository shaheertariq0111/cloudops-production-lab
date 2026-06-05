variable "aws_region" {
  description = "AWS region where Terraform will create resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for tagging and naming resources."
  type        = string
  default     = "cloudops-terraform-lab"
}

variable "environment" {
  description = "Environment name for this Terraform deployment."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the Terraform-managed VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet used by EC2."
  type        = string
  default     = "10.20.1.0/24"
}

variable "private_subnet_a_cidr" {
  description = "CIDR block for the first private subnet used by future RDS."
  type        = string
  default     = "10.20.11.0/24"
}

variable "private_subnet_b_cidr" {
  description = "CIDR block for the second private subnet used by future RDS."
  type        = string
  default     = "10.20.12.0/24"
}

variable "allowed_ssh_cidr" {
  description = "Public IP CIDR allowed to SSH into the future EC2 instance. Example: 203.0.113.10/32"
  type        = string
}

variable "ec2_key_name" {
  description = "Name of the existing AWS EC2 key pair to use for SSH."
  type        = string
  default     = "cloudops-terraform-key"
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the Terraform-managed app server."
  type        = string
  default     = "t3.micro"
}

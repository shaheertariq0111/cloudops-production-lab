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

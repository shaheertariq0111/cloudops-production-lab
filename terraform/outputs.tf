output "vpc_id" {
  description = "ID of the Terraform-managed VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet."
  value       = aws_subnet.public_a.id
}

output "private_subnet_a_id" {
  description = "ID of the first private subnet."
  value       = aws_subnet.private_a.id
}

output "private_subnet_b_id" {
  description = "ID of the second private subnet."
  value       = aws_subnet.private_b.id
}

output "internet_gateway_id" {
  description = "ID of the internet gateway."
  value       = aws_internet_gateway.main.id
}

output "public_route_table_id" {
  description = "ID of the public route table."
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table."
  value       = aws_route_table.private.id
}

output "ec2_security_group_id" {
  description = "ID of the EC2 application security group."
  value       = aws_security_group.ec2_app.id
}

output "rds_security_group_id" {
  description = "ID of the RDS database security group."
  value       = aws_security_group.rds.id
}

output "s3_upload_bucket_name" {
  description = "Name of the private S3 uploads bucket."
  value       = aws_s3_bucket.app_uploads.bucket
}

output "s3_upload_bucket_arn" {
  description = "ARN of the private S3 uploads bucket."
  value       = aws_s3_bucket.app_uploads.arn
}

output "ec2_iam_role_name" {
  description = "Name of the IAM role for the future EC2 instance."
  value       = aws_iam_role.ec2_app.name
}

output "ec2_instance_profile_name" {
  description = "Name of the IAM instance profile for the future EC2 instance."
  value       = aws_iam_instance_profile.ec2_app.name
}

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

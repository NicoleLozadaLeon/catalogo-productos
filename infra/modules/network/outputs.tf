output "vpc_id" {
  description = "ID de la VPC creada"
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "ID de la subred pública principal (la usa la EC2)"
  value       = aws_subnet.public.id
}

output "subnet_ids" {
  description = "IDs de ambas subredes públicas (para el DB subnet group multi-AZ)"
  value       = [aws_subnet.public.id, aws_subnet.public_b.id]
}

output "sg_id" {
  description = "ID del Security Group de la app"
  value       = aws_security_group.app.id
}

output "public_ip" {
  description = "IP pública de la instancia EC2"
  value       = aws_instance.app.public_ip
}

output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.app.id
}

output "public_dns" {
  description = "DNS público de la instancia EC2"
  value       = aws_instance.app.public_dns
}

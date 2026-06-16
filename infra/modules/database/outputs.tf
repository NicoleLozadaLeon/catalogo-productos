output "db_endpoint" {
  description = "Endpoint de conexión a la RDS (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "db_host" {
  description = "Host de la RDS (sin puerto)"
  value       = aws_db_instance.postgres.address
}

output "db_name" {
  description = "Nombre de la base de datos"
  value       = aws_db_instance.postgres.db_name
}

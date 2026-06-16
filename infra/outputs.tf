output "ec2_public_ip" {
  description = "IP pública de la instancia EC2 donde corre la app"
  value       = module.compute.public_ip
}

output "app_url" {
  description = "URL para acceder a la aplicación"
  value       = "http://${module.compute.public_ip}:3000"
}

output "rds_endpoint" {
  description = "Endpoint de la base de datos RDS PostgreSQL"
  value       = module.database.db_endpoint
}

output "s3_bucket_name" {
  description = "Nombre del bucket S3 para uploads e imágenes"
  value       = module.serverless.bucket_name
}

output "lambda_arn" {
  description = "ARN de la función Lambda para procesamiento de imágenes"
  value       = module.serverless.lambda_arn
}

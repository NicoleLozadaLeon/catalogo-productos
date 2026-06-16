output "bucket_name" {
  description = "Nombre del bucket S3 para uploads"
  value       = aws_s3_bucket.uploads.bucket
}

output "bucket_arn" {
  description = "ARN del bucket S3"
  value       = aws_s3_bucket.uploads.arn
}

output "lambda_arn" {
  description = "ARN de la función Lambda de miniaturas"
  value       = aws_lambda_function.thumbnail.arn
}

output "lambda_name" {
  description = "Nombre de la función Lambda"
  value       = aws_lambda_function.thumbnail.function_name
}

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Estado remoto en S3 — sin DynamoDB lock (Learner Lab no lo soporta)
  backend "s3" {
    bucket = "catalogo-tf-state-4489312"
    key    = "catalogo/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  # Las credenciales entran por ~/.aws/credentials — NUNCA en este archivo
}

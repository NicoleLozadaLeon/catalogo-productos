variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "vpc_id" {
  description = "ID de la VPC donde se crea la RDS"
  type        = string
}

variable "subnet_ids" {
  description = "IDs de las subredes (≥2 AZ) para el subnet group de RDS"
  type        = list(string)
}

variable "sg_id" {
  description = "ID del Security Group que permite acceso a la BD"
  type        = string
}

variable "db_name" {
  description = "Nombre de la base de datos"
  type        = string
}

variable "db_username" {
  description = "Usuario administrador de la BD"
  type        = string
}

variable "db_password" {
  description = "Contraseña de la BD"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Tipo de instancia RDS"
  type        = string
  default     = "db.t3.micro"
}

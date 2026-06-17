# ============================================================
# Módulo Database: RDS PostgreSQL db.t3.micro
# ============================================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name    = "${var.project_name}-db-subnet-group"
    Project = var.project_name
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-db"
  engine            = "postgres"
  engine_version    = "16.9"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.sg_id]

  publicly_accessible = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name    = "${var.project_name}-db"
    Project = var.project_name
  }
}

# Fase 6: la contraseña vive en Parameter Store (SecureString), no en variables
# de entorno en texto plano. La EC2 la lee en runtime con su instance profile.
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.project_name}/db_password"
  description = "Contraseña de la BD PostgreSQL — Fase 6 (blindaje de secretos)"
  type        = "SecureString"
  value       = var.db_password

  tags = {
    Name    = "${var.project_name}-db-password"
    Project = var.project_name
  }
}

# ============================================================
# Módulo Compute: EC2 t3.micro con Docker + App
# ============================================================

# AMI fijada en var.ami_id (ver variables.tf) para despliegues reproducibles.
#
# Para volver al modo dinámico (siempre la AMI más reciente de Amazon Linux 2023),
# descomenta este data source y usa `data.aws_ami.amazon_linux_2023.id` en el
# atributo `ami` de la instancia. Aviso: el modo dinámico fuerza el reemplazo de
# la EC2 cada vez que AWS publica una AMI nueva.
#
# data "aws_ami" "amazon_linux_2023" {
#   most_recent = true
#   owners      = ["amazon"]
#
#   filter {
#     name   = "name"
#     values = ["al2023-ami-*-x86_64"]
#   }
#
#   filter {
#     name   = "virtualization-type"
#     values = ["hvm"]
#   }
# }

# Script de arranque: instala Docker, clona el repo y corre la app
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1

    echo "=== [1/6] Instalando Docker, Git y AWS CLI ==="
    dnf update -y
    dnf install -y docker git unzip
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user

    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws

    echo "=== [2/6] Instalando Docker Compose plugin ==="
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    echo "=== [3/6] Clonando repositorio ==="
    git clone ${var.github_repo_url} /opt/catalogo
    mkdir -p /opt/catalogo/app/uploads
    chown -R ec2-user:ec2-user /opt/catalogo

    echo "=== [4/6] Construyendo imagen Docker ==="
    cd /opt/catalogo/app
    docker build -t catalogo-app:latest .

    echo "=== [5/6] Leyendo contraseña de BD desde Parameter Store ==="
    DB_PASSWORD=$(aws ssm get-parameter \
      --name "${var.db_password_ssm_param}" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text \
      --region ${var.aws_region})

    echo "=== [6/6] Iniciando contenedor ==="
    docker run -d \
      --name catalogo-app \
      --restart unless-stopped \
      -p 3000:3000 \
      -e NODE_ENV=production \
      -e PORT=3000 \
      -e DB_HOST=${var.db_host} \
      -e DB_PORT=5432 \
      -e DB_NAME=${var.db_name} \
      -e DB_USER=${var.db_username} \
      -e "DB_PASSWORD=$DB_PASSWORD" \
      -e USE_S3=true \
      -e S3_BUCKET=${var.s3_bucket_name} \
      -e AWS_REGION=${var.aws_region} \
      -v /opt/catalogo/app/uploads:/app/uploads \
      catalogo-app:latest

    echo "=== Despliegue completado ==="
  EOF
}

resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = var.ec2_instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.sg_id]

  # LabInstanceProfile: permite a la EC2 acceder a S3 y Parameter Store
  iam_instance_profile = "LabInstanceProfile"

  # vockey: key pair por defecto del Learner Lab (descargable desde AWS Details → Download PEM)
  key_name = "vockey"

  user_data                   = local.user_data
  user_data_replace_on_change = true

  root_block_device {
    # La AMI de Amazon Linux 2023 trae un snapshot raíz de 30 GB; el volumen
    # no puede ser menor que el snapshot, por eso 30 (no 20).
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name    = "${var.project_name}-ec2-app"
    Project = var.project_name
  }
}

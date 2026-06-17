variable "project_name" {
  description = "Nombre del proyecto, usado como prefijo en los recursos de red"
  type        = string
}

# CIDR autorizado para SSH (puerto 22). Por defecto abierto para permitir
# EC2 Instance Connect desde el Learner Lab (IP del operador dinámica), pero
# parametrizado para poder restringirlo a una IP/rango concreto en
# terraform.tfvars y aplicar el principio de mínima exposición.
variable "ssh_allowed_cidr" {
  description = "Rango CIDR autorizado a conectarse por SSH (22). Restringir a la IP propia cuando sea posible."
  type        = string
  default     = "0.0.0.0/0"
}

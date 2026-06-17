module "network" {
  source       = "./modules/network"
  project_name = var.project_name
}

module "serverless" {
  source       = "./modules/serverless"
  project_name = var.project_name
}

module "database" {
  source          = "./modules/database"
  project_name    = var.project_name
  vpc_id          = module.network.vpc_id
  subnet_ids      = module.network.subnet_ids
  sg_id           = module.network.sg_id
  db_name         = var.db_name
  db_username     = var.db_username
  db_password     = var.db_password
  db_instance_class = var.db_instance_class
}

module "compute" {
  source                 = "./modules/compute"
  project_name           = var.project_name
  subnet_id              = module.network.subnet_id
  sg_id                  = module.network.sg_id
  ec2_instance_type      = var.ec2_instance_type
  db_endpoint            = module.database.db_endpoint
  db_host                = module.database.db_host
  db_name                = var.db_name
  db_username            = var.db_username
  db_password_ssm_param  = module.database.db_password_ssm_param
  s3_bucket_name         = module.serverless.bucket_name
  aws_region             = var.aws_region
  github_repo_url        = "https://github.com/NicoleLozadaLeon/catalogo-productos.git"
}

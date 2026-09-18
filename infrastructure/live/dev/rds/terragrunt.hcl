include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/rds"
}

dependency "vpc" {
  config_path = "../vpc"
}
dependency "security" {
  config_path = "../security"
}


inputs = {
  name                    = "streamflix-dev-postgres"
  subnet_ids              = dependency.vpc.outputs.private_subnets
  security_group_ids      = [dependency.security.outputs.data_security_group_id]
  engine_version          = "17"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  max_allocated_storage   = 100
  db_name                 = "streamflix"
  username                = "streamflix"
  password                = get_env("STREAMFLIX_DB_PASSWORD", "CHANGE-ME-DB-PASSWORD")
  multi_az                = false
  deletion_protection     = false
  skip_final_snapshot     = true
  backup_retention_period = 7
  tags                    = local.tags

}

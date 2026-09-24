include "root" {
  path   = find_in_parent_folders()
  expose = true
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
  name = "streamflix-dev"

  engine         = "postgres"
  engine_version = "16"

  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 100

  db_name = "streamflix"
  username = "streamflix"

  port = 5432

  subnet_ids = dependency.vpc.outputs.private_subnets

  security_group_ids = [
    dependency.security.outputs.data_security_group_id
  ]

  publicly_accessible     = false
  multi_az                = false
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7

  tags = include.root.locals.tags
}
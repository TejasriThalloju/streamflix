include "root" {
  path   = find_in_parent_folders()
  expose = true
}

terraform {
  source = "../../../terraform/modules/elasticache"
}

dependency "vpc" {
  config_path = "../vpc"

   mock_outputs = {
    private_subnets = ["subnet-mock-1", "subnet-mock-2"]
  }
}

dependency "security" {
  config_path = "../security"

   mock_outputs = {
    data_security_group_id = "sg-mock"
  }
}

inputs = {
  name = "streamflix-dev"

  engine_version = "7.1"

  node_type = "cache.t4g.micro"

  num_cache_nodes = 1

  port = 6379

  subnet_ids = dependency.vpc.outputs.private_subnets

  security_group_ids = [
    dependency.security.outputs.data_security_group_id
  ]

  tags = include.root.locals.tags
}
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/elasticache"
}

dependency "vpc" {
  config_path = "../vpc"
}
dependency "security" {
  config_path = "../security"
}


inputs = {
  name               = "streamflix-dev-redis"
  subnet_ids         = dependency.vpc.outputs.private_subnets
  security_group_ids = [dependency.security.outputs.data_security_group_id]
  node_type          = "cache.t4g.micro"
  tags               = local.tags

}

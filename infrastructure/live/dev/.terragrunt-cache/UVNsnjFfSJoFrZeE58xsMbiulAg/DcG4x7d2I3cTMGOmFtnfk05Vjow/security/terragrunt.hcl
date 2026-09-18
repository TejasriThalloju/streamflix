include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/security"
}

dependency "vpc" {
  config_path = "../vpc"
}
dependency "eks" {
  config_path = "../eks"
}


inputs = {
  name                        = "streamflix-dev"
  vpc_id                      = dependency.vpc.outputs.vpc_id
  eks_node_security_group_id  = dependency.eks.outputs.node_security_group_id
  tags                        = local.tags

}

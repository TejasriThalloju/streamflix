include "root" {
  path = find_in_parent_folders("terragrunt.hcl")
}

terraform {
  source = "../../../terraform/modules/vpc"
}

locals {
  project     = "streamflix"
  environment = "dev"

  tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

inputs = {
  name               = "streamflix-dev"
  cidr               = "10.10.0.0/16"
  azs                = ["ap-south-1a", "ap-south-1b"]
  private_subnets    = ["10.10.1.0/24", "10.10.2.0/24"]
  public_subnets     = ["10.10.101.0/24", "10.10.102.0/24"]
  single_nat_gateway = true
  tags               = local.tags
}
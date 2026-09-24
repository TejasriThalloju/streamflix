include "root" {
  path = find_in_parent_folders("terragrunt.hcl")
}

terraform {
  source = "../../../terraform/modules/ecr"
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
  repositories = ["streamflix/api", "streamflix/web", "streamflix/worker"]
  tags         = local.tags

}

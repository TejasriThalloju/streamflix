locals {
  region      = "ap-south-1"
  project     = "streamflix"
  environment = "stage"
  tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket       = get_env("TF_STATE_BUCKET", "streamflix-terraform-state-CHANGE-ME")
    key          = "${local.project}/${local.environment}/${path_relative_to_include()}/terraform.tfstate"
    region       = local.region
    encrypt        = true
    dynamodb_table = get_env("TF_LOCK_TABLE", "streamflix-terraform-lock")
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = "${local.region}"
}
EOF
}

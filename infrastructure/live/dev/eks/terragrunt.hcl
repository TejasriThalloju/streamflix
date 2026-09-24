include "root" {
  path = find_in_parent_folders()
  expose = true
}

terraform {
  source = "../../../terraform/modules/eks"
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "github" {
  config_path = "../github-oidc"

  mock_outputs_allowed_terraform_commands = ["plan", "validate"]

  mock_outputs = {
    role_arn = "arn:aws:iam::123456789012:role/streamflix-github-actions"
  }
}

locals {
  tags = {
    Project     = "streamflix"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

inputs = {
  cluster_name            = "streamflix-dev"
  kubernetes_version      = "1.36"

  vpc_id                  = dependency.vpc.outputs.vpc_id
  subnet_ids              = dependency.vpc.outputs.private_subnets

  instance_types          = ["t3.medium"]
  min_size                = 1
  desired_size            = 2
  max_size                = 3

  github_actions_role_arn = dependency.github.outputs.role_arn

  tags = local.tags
}
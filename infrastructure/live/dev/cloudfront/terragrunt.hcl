include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/cloudfront"
}

locals {
  region = "ap-south-1"

  tags = {
    Project     = "streamflix"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

dependency "s3" {
  config_path = "../s3"

  mock_outputs_allowed_terraform_commands = ["plan", "validate"]

  mock_outputs = {
    bucket_name = "streamflix-dev-mock"
    bucket_arn  = "arn:aws:s3:::streamflix-dev-mock"
  }
}

inputs = {
  name                = "streamflix-dev"
  bucket_name         = dependency.s3.outputs.bucket_name
  bucket_arn          = dependency.s3.outputs.bucket_arn
  region              = local.region
  default_root_object = "index.html"
  acm_certificate_arn = ""
  web_acl_arn         = ""
  aliases             = []
  tags                = local.tags
}
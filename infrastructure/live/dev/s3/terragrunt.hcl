include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/s3"
}

locals {
  tags = {
    Project     = "streamflix"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

inputs = {
  bucket_name  = get_env("STREAMFLIX_MEDIA_BUCKET", "streamflix-media-tejasri-2026")
  cors_origins = ["*"]
  tags         = local.tags
}
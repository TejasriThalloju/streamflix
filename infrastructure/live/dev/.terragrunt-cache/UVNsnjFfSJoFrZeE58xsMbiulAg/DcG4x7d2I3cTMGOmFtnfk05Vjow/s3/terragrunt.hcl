include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/s3"
}

dependency "vpc" {
  config_path = "../vpc"
}


inputs = {
  bucket_name  = get_env("STREAMFLIX_MEDIA_BUCKET", "streamflix-media-CHANGE-ME")
  cors_origins = ["*"]
  tags         = local.tags

}

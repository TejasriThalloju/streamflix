include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/cloudfront"
}

dependency "s3" {
  config_path = "../s3"
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

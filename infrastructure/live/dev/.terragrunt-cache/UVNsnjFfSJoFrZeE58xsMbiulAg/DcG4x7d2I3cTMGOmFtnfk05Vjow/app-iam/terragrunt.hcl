include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/app-iam"
}

dependency "eks" {
  config_path = "../eks"
}
dependency "s3" {
  config_path = "../s3"
}
dependency "secrets" {
  config_path = "../secrets"
}


inputs = {
  name                   = "streamflix-dev"
  namespace              = "streamflix"
  api_service_account    = "streamflix-api"
  worker_service_account = "streamflix-worker"
  oidc_provider_arn      = dependency.eks.outputs.cluster_oidc_provider_arn
  oidc_issuer_url        = dependency.eks.outputs.cluster_oidc_issuer_url
  bucket_arn             = dependency.s3.outputs.bucket_arn
  secrets_arn            = dependency.secrets.outputs.arn

}

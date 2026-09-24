include "root" {
  path = find_in_parent_folders()
  expose = true
}

terraform {
  source = "../../../terraform/modules/lbc-iam"
}

dependency "eks" {
  config_path = "../eks"
}


inputs = {
  name               = "streamflix-dev-aws-lbc"
  oidc_provider_arn  = dependency.eks.outputs.cluster_oidc_provider_arn
  oidc_issuer_url    = dependency.eks.outputs.cluster_oidc_issuer_url

}

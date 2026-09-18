include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/github-oidc"
}



inputs = {
  role_name       = "streamflix-dev-github-actions"
  subject_pattern = "repo:YOUR_GITHUB_ORG/YOUR_GITHUB_REPO:*"

}

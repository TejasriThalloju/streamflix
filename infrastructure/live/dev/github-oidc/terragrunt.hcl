include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/github-oidc"
}

inputs = {
  role_name       = "StreamFlixGitHubActionsRole"
  subject_pattern = "repo:TejasriThalloju/streamflix:*"
}
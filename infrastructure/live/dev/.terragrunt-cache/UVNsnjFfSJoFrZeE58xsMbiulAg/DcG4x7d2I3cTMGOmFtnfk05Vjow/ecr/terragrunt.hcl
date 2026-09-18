include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../terraform/modules/ecr"
}



inputs = {
  repositories = ["streamflix/api", "streamflix/web", "streamflix/worker"]
  tags         = local.tags

}

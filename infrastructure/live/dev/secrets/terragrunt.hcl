include "root" {
  path   = find_in_parent_folders()
  expose = true
}

terraform {
  source = "../../../terraform/modules/secrets"
}

dependency "rds" {
  config_path = "../rds"
}

dependency "redis" {
  config_path = "../elasticache"
}

inputs = {
  name = "streamflix-dev"

  database_url = "postgresql://streamflix:${get_env("STREAMFLIX_DB_PASSWORD", "CHANGE-ME-DB-PASSWORD")}@${dependency.rds.outputs.endpoint}:5432/streamflix"

  redis_url = "rediss://${dependency.redis.outputs.primary_endpoint}:6379"

  jwt_secret = get_env(
    "STREAMFLIX_JWT_SECRET",
    "CHANGE-ME-JWT-SECRET"
  )

  tags = include.root.locals.tags
}
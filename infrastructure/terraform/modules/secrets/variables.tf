variable "name" { type = string }
variable "database_url" { type = string sensitive = true }
variable "redis_url" { type = string sensitive = true }
variable "jwt_secret" { type = string sensitive = true }
variable "tags" { type = map(string) default = {} }

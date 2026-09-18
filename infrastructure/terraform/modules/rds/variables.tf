variable "name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "engine_version" { type = string default = "17" }
variable "instance_class" { type = string default = "db.t4g.micro" }
variable "allocated_storage" { type = number default = 20 }
variable "max_allocated_storage" { type = number default = 100 }
variable "db_name" { type = string default = "streamflix" }
variable "username" { type = string default = "streamflix" }
variable "password" { type = string sensitive = true }
variable "multi_az" { type = bool default = false }
variable "deletion_protection" { type = bool default = false }
variable "skip_final_snapshot" { type = bool default = true }
variable "backup_retention_period" { type = number default = 7 }
variable "tags" { type = map(string) default = {} }

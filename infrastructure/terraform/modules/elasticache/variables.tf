variable "name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "node_type" { type = string default = "cache.t4g.micro" }
variable "tags" { type = map(string) default = {} }

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "eks_node_security_group_id" { type = string }
variable "tags" { type = map(string) default = {} }

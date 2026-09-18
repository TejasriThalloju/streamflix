variable "cluster_name" { type = string }
variable "kubernetes_version" { type = string default = "1.36" }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "instance_types" { type = list(string) default = ["t3.medium"] }
variable "min_size" { type = number default = 1 }
variable "max_size" { type = number default = 3 }
variable "desired_size" { type = number default = 2 }
variable "github_actions_role_arn" { type = string default = "" }
variable "tags" { type = map(string) default = {} }

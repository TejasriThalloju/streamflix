variable "cluster_name" {
  type = string
}

variable "kubernetes_version" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "instance_types" {
  type = list(string)
}

variable "min_size" {
  type = number
}

variable "desired_size" {
  type = number
}

variable "max_size" {
  type = number
}

variable "github_actions_role_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
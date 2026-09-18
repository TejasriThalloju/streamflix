variable "name" { type = string }
variable "bucket_name" { type = string }
variable "bucket_arn" { type = string }
variable "region" { type = string }
variable "default_root_object" { type = string default = "index.html" }
variable "acm_certificate_arn" { type = string default = "" }
variable "web_acl_arn" { type = string default = "" }
variable "aliases" { type = list(string) default = [] }
variable "tags" { type = map(string) default = {} }

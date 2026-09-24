variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "state_bucket" {
  type = string
}

variable "lock_table" {
  type    = string
  default = "streamflix-terraform-lock"
}
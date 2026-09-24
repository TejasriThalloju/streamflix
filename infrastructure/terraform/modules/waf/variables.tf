variable "name" {
  type = string
}

variable "scope" {
  type    = string
  default = "CLOUDFRONT"
}

variable "tags" {
  type    = map(string)
  default = {}
}
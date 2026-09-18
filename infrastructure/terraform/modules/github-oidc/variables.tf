variable "role_name" { type = string }
variable "subject_pattern" {
  type    = string
  default = "repo:YOUR_GITHUB_ORG/YOUR_GITHUB_REPO:*"
}

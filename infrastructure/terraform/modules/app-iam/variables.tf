variable "name" { type = string }
variable "namespace" { type = string default = "streamflix" }
variable "api_service_account" { type = string default = "streamflix-api" }
variable "worker_service_account" { type = string default = "streamflix-worker" }
variable "oidc_provider_arn" { type = string }
variable "oidc_issuer_url" { type = string }
variable "bucket_arn" { type = string }
variable "secrets_arn" { type = string default = "" }

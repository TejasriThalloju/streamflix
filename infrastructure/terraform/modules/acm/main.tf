resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"
  subject_alternative_names = var.subject_alternative_names
  lifecycle { create_before_destroy = true }
  tags = var.tags
}

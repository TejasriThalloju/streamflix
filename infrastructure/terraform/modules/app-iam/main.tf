data "aws_caller_identity" "current" {}

resource "aws_iam_role" "api" {
  name = "${var.name}-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = var.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(var.oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(var.oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:${var.namespace}:${var.api_service_account}"
        }
      }
    }]
  })
}

resource "aws_iam_role" "worker" {
  name = "${var.name}-worker"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = var.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(var.oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(var.oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:${var.namespace}:${var.worker_service_account}"
        }
      }
    }]
  })
}

resource "aws_iam_policy" "s3" {
  name = "${var.name}-s3"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject", "s3:PutObject", "s3:DeleteObject",
        "s3:ListBucket", "s3:GetBucketLocation"
      ]
      Resource = [var.bucket_arn, "${var.bucket_arn}/*"]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_s3" {
  role       = aws_iam_role.api.name
  policy_arn = aws_iam_policy.s3.arn
}

resource "aws_iam_role_policy_attachment" "worker_s3" {
  role       = aws_iam_role.worker.name
  policy_arn = aws_iam_policy.s3.arn
}

resource "aws_iam_role_policy_attachment" "api_secrets" {
  count      = var.secrets_arn == "" ? 0 : 1
  role       = aws_iam_role.api.name
  policy_arn = aws_iam_policy.secrets[0].arn
}

resource "aws_iam_role_policy_attachment" "worker_secrets" {
  count      = var.secrets_arn == "" ? 0 : 1
  role       = aws_iam_role.worker.name
  policy_arn = aws_iam_policy.secrets[0].arn
}

resource "aws_iam_policy" "secrets" {
  count = var.secrets_arn == "" ? 0 : 1
  name  = "${var.name}-secrets"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = var.secrets_arn
    }]
  })
}

resource "aws_secretsmanager_secret" "this" {
  name                    = var.name
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id = aws_secretsmanager_secret.this.id
  secret_string = jsonencode({
    DATABASE_URL = var.database_url
    REDIS_URL    = var.redis_url
    JWT_SECRET   = var.jwt_secret
  })
}

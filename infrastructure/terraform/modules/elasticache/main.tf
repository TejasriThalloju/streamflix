resource "aws_elasticache_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = var.name
  description                = "StreamFlix Redis"
  engine                     = "redis"
  node_type                  = var.node_type
  num_cache_clusters         = 1
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  transit_encryption_enabled = true
  automatic_failover_enabled = false
  at_rest_encryption_enabled = true
  security_group_ids         = var.security_group_ids
  tags                       = var.tags
}

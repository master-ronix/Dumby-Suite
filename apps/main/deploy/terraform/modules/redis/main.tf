/**
 * Terraform module: redis
 * Provisions the Dumby Redis cache/queue backend.
 * Blueprint §41.6 treats Redis as managed infrastructure alongside
 * PostgreSQL and the Kubernetes cluster.
 */
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "cluster_id" {
  description = "ElastiCache replication group identifier"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the Redis subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs allowed to reach Redis"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "num_cache_clusters" {
  description = "Number of cache nodes in the replication group"
  type        = number
  default     = 2
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = var.cluster_id
  description                = "Dumby Redis cache and queue backend"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = var.security_group_ids

  tags = {
    Service = "dumby"
  }
}

output "primary_endpoint_address" {
  value     = aws_elasticache_replication_group.this.primary_endpoint_address
  sensitive = true
}

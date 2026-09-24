# StreamFlix AWS Architecture

## Application

- API: Node.js / Express
- Web: React / Vite
- Worker: Node.js + FFmpeg
- Database: PostgreSQL
- Cache: Redis
- Object storage: S3
- Streaming: HLS

## Kubernetes

- EKS
- Helm
- AWS Load Balancer Controller
- Horizontal Pod Autoscaler
- PodDisruptionBudget
- Service Accounts with AWS IAM roles

## Infrastructure

- VPC
- public/private subnets
- NAT Gateway
- ECR
- EKS
- RDS
- ElastiCache
- S3
- Secrets Manager
- CloudFront
- WAF
- ACM
- Route53

## CI/CD

```text
GitHub
  |
GitHub Actions
  |
  +-- npm/build/test
  |
  +-- Docker build
  |
  +-- ECR push
  |
  +-- aws eks update-kubeconfig
  |
  +-- Helm upgrade
  |
  v
EKS
```

## Video flow

```text
Admin
  |
  v
API
  |
  v
S3 raw/<movie-id>/source.mp4
  |
  v
FFmpeg Worker
  |
  v
S3 hls/<movie-id>/master.m3u8
  |
  v
CloudFront
  |
  v
HLS.js browser player
```

The current ZIP intentionally keeps the working FFmpeg worker for the first AWS migration. MediaConvert can be introduced after the EKS/RDS/Redis/S3 path is stable.

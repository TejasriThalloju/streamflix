# Local → AWS mapping

| Local | Target AWS |
|---|---|
| React/Vite | S3 + CloudFront |
| Express | EKS behind ALB/API Gateway |
| PostgreSQL | RDS/Aurora PostgreSQL |
| Redis | ElastiCache Redis |
| MinIO | S3 |
| FFmpeg worker | MediaConvert + event-driven worker |
| Docker | ECR |
| Docker Compose | EKS + Helm |
| `.github/workflows/ci.yml` | GitHub Actions CI/CD |
| local auth secret | AWS Secrets Manager |
| local TLS/ingress | ACM + ALB + CloudFront |
| app logs | CloudWatch |
| CDN/WAF | CloudFront + WAF |
| DNS | Route 53 |

The supplied architecture describes the same major progression: application first,
then AWS foundation, networking, Terraform/Terragrunt, database/cache, Docker, EKS,
CI/CD, video streaming, security, monitoring, scaling, and DR/troubleshooting.

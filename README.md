# StreamFlix — AWS + Terraform + Terragrunt + Helm

This ZIP is based on the uploaded working StreamFlix application. The existing API, React frontend, FFmpeg worker, admin upload flow, HLS processing and database schema are preserved.

## Included

- StreamFlix API
- React/Vite frontend
- Admin movie upload
- FFmpeg HLS worker
- PostgreSQL schema
- Local Docker Compose + MinIO
- Terraform modules
- Terragrunt `dev`, `stage`, `prod` structure
- ECR
- EKS
- RDS PostgreSQL
- ElastiCache Redis
- S3
- IAM / EKS OIDC
- AWS Load Balancer Controller IAM
- Secrets Manager
- Helm application chart
- GitHub Actions
- CloudFront OAC module
- WAF module
- ACM module
- Route53 module
- Bootstrap Terraform state

## AWS architecture

```text
Route53
   |
CloudFront + WAF
   |
   +------------------> S3 (HLS / thumbnails / media)
   |
ALB
   |
EKS
 +-----+--------+
 |     |        |
API   Web     Worker
 |     |        |
 +-----+--------+
       |
 RDS PostgreSQL
 ElastiCache Redis
       |
 Secrets Manager
```

## Important AWS design detail

The application is configured to use the AWS SDK default credential chain when `S3_ENDPOINT`, `S3_ACCESS_KEY` and `S3_SECRET_KEY` are absent. In EKS, the API and worker service accounts receive S3 IAM permissions through EKS OIDC/IRSA.

The frontend uses a runtime `/config.js`, so `VITE_API_URL` can be injected by the container at startup instead of rebuilding the React bundle for every environment.

## Local development

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

- Web: http://localhost:3000
- API: http://localhost:4000/health
- MinIO: http://localhost:9001

Demo accounts created by the existing API:
- Admin: `admin@streamflix.local` / `Admin@123`
- User: `user@streamflix.local` / `User@123`

Do not use these credentials in production.

## AWS deployment

Read:

`docs/AWS-DEPLOYMENT.md`

Recommended sequence:

1. Bootstrap Terraform state.
2. Deploy VPC.
3. Deploy ECR.
4. Deploy EKS.
5. Deploy data security group.
6. Deploy RDS and Redis.
7. Deploy S3.
8. Deploy Secrets Manager.
9. Deploy application IAM.
10. Deploy AWS Load Balancer Controller.
11. Build/push ECR images.
12. Deploy Helm.
13. Configure DNS/ACM/CloudFront/WAF.
14. Enable External Secrets.
15. Move video processing to MediaConvert when the core deployment is stable.

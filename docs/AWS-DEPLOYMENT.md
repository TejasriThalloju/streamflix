# StreamFlix AWS Deployment — Exact Order

## 0. Required tools

Install:
- AWS CLI
- Terraform >= 1.6
- Terragrunt
- kubectl
- Helm 3
- Docker
- Git

Verify:
```bash
aws --version
terraform version
terragrunt --version
kubectl version --client
helm version
docker version
```

## 1. AWS login

```bash
aws configure
aws sts get-caller-identity
export AWS_REGION=ap-south-1
```

On Windows Git Bash:
```bash
export AWS_REGION=ap-south-1
```

## 2. Create Terraform state

Pick a globally unique S3 bucket:

```bash
export TF_STATE_BUCKET=streamflix-terraform-state-YOUR_ACCOUNT_ID
export TF_LOCK_TABLE=streamflix-terraform-lock
```

Then:

```bash
./scripts/bootstrap-state.sh
```

Do not delete the state bucket.

## 3. Configure environment secrets

For the Terraform commands:

```bash
export STREAMFLIX_MEDIA_BUCKET=streamflix-media-YOUR_ACCOUNT_ID
export STREAMFLIX_DB_PASSWORD='CHANGE_ME_LONG_RANDOM_PASSWORD'
export STREAMFLIX_JWT_SECRET='CHANGE_ME_LONG_RANDOM_SECRET'
export TF_STATE_BUCKET=streamflix-terraform-state-YOUR_ACCOUNT_ID
export TF_LOCK_TABLE=streamflix-terraform-lock
```

## 4. Configure GitHub OIDC subject

Edit:

`infrastructure/live/dev/github-oidc/terragrunt.hcl`

Replace:

```text
YOUR_GITHUB_ORG/YOUR_GITHUB_REPO
```

with the actual GitHub repository.

## 5. Deploy infrastructure

From:

```bash
cd infrastructure/live/dev
```

First initialize:

```bash
terragrunt run-all init
```

Review:

```bash
terragrunt run-all plan
```

Then apply:

```bash
terragrunt run-all apply
```

For a safer first deployment, apply in this order:

```bash
terragrunt apply --terragrunt-working-dir vpc
terragrunt apply --terragrunt-working-dir ecr
terragrunt apply --terragrunt-working-dir github-oidc
terragrunt apply --terragrunt-working-dir eks
terragrunt apply --terragrunt-working-dir security
terragrunt apply --terragrunt-working-dir rds
terragrunt apply --terragrunt-working-dir elasticache
terragrunt apply --terragrunt-working-dir s3
terragrunt apply --terragrunt-working-dir secrets
terragrunt apply --terragrunt-working-dir app-iam
terragrunt apply --terragrunt-working-dir lbc-iam
terragrunt apply --terragrunt-working-dir cloudfront
```

If your Terragrunt version does not support `--terragrunt-working-dir`, simply `cd` into each directory and run `terragrunt apply`.

## 6. Configure kubectl

```bash
aws eks update-kubeconfig \
  --region "$AWS_REGION" \
  --name streamflix-dev

kubectl get nodes
```

## 7. Install AWS Load Balancer Controller

Get the role:

```bash
cd infrastructure/live/dev/lbc-iam
terragrunt output -raw role_arn
```

Set it:

```bash
export LBC_ROLE_ARN=$(terragrunt output -raw role_arn)
```

From repository root:

```bash
./scripts/install-aws-load-balancer-controller.sh
```

Verify:

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

## 8. Install metrics-server

The Helm chart includes an HPA. Install metrics-server before expecting HPA CPU metrics:

```bash
./scripts/install-metrics-server.sh
kubectl top nodes
```

## 9. Build and push images

Get the AWS account ID:

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export TAG=$(git rev-parse --short HEAD)
```

Then:

```bash
./scripts/build-push.sh
```

## 10. Get application IAM role ARNs

```bash
cd infrastructure/live/dev/app-iam

export API_ROLE_ARN=$(terragrunt output -raw api_role_arn)
export WORKER_ROLE_ARN=$(terragrunt output -raw worker_role_arn)
```

Get the S3 bucket:

```bash
cd ../s3
export S3_BUCKET=$(terragrunt output -raw bucket_name)
```

## 11. Deploy Helm

Initially use the ALB hostname as the API URL only if you want separate API addressing. The recommended setup is to use the same ALB host and path routing, so leave `API_URL` empty and let the frontend call `/api`.

```bash
export API_URL=
export MEDIA_PUBLIC_BASE_URL=$(cd infrastructure/live/dev/cloudfront && terragrunt output -raw domain_name)
export IMAGE_TAG="$TAG"
export ECR_REGISTRY="$ECR_REGISTRY"

./scripts/deploy-helm.sh
```

Check:

```bash
kubectl get pods -n streamflix
kubectl get ingress -n streamflix
```

Wait for an ALB hostname:

```bash
kubectl get ingress -n streamflix
```

## 12. Test

```bash
curl http://ALB-DNS-NAME/api/movies
```

Open the ALB hostname in a browser.

## 13. Secrets Manager / External Secrets

The Terraform deployment creates:

```text
streamflix/dev/app
```

Install External Secrets:

```bash
./scripts/install-external-secrets.sh
```

Then deploy Helm with:

```bash
helm upgrade --install streamflix ./helm/streamflix \
  --namespace streamflix \
  --create-namespace \
  -f ./helm/streamflix/values-dev.yaml \
  --set externalSecrets.enabled=true \
  --set externalSecrets.secretName=streamflix/dev/app
```

The API and worker then consume `streamflix-app-secret`.

## 14. CloudFront

The CloudFront module is included under:

`infrastructure/terraform/modules/cloudfront`

It uses S3 Origin Access Control. Keep the media bucket private. Do not make raw video objects public.

After creating CloudFront, set:

```text
MEDIA_PUBLIC_BASE_URL=https://YOUR_CLOUDFRONT_DOMAIN
```

The API then returns:

```text
https://YOUR_CLOUDFRONT_DOMAIN/hls/<movie-id>/master.m3u8
```

and thumbnail URLs:

```text
https://YOUR_CLOUDFRONT_DOMAIN/thumbnails/<movie-id>/poster.jpg
```

## 15. Route53 and ACM

The modules are provided separately because the real domain is required.

For CloudFront ACM certificates, create/use the certificate in `us-east-1`.

For ALB certificates, use the certificate in the ALB's AWS region.

Do not copy a CloudFront ACM ARN from `ap-south-1`; CloudFront requires ACM in `us-east-1`.

## 16. GitHub Actions

The Terraform GitHub OIDC module creates:

```text
streamflix-dev-github-actions
```

Add this GitHub environment secret:

```text
AWS_DEPLOY_ROLE_ARN
```

Also add:

```text
API_URL
MEDIA_PUBLIC_BASE_URL
S3_BUCKET
API_ROLE_ARN
WORKER_ROLE_ARN
```

Run:

GitHub → Actions → StreamFlix Deploy → Run workflow.

## 17. Production hardening

Before production:
- replace demo passwords
- use strong JWT secret
- use private EKS endpoint or restricted API access
- use private S3 + CloudFront OAC
- use ACM/TLS
- enable WAF
- enable RDS deletion protection
- use Multi-AZ RDS
- use Redis HA/replicas
- use separate AWS accounts where appropriate
- use separate Terraform state
- restrict GitHub OIDC subject
- replace AdministratorAccess on GitHub role with least-privilege policies
- add CloudWatch/Prometheus/Grafana
- add backups and disaster recovery
- add MediaConvert for managed transcoding

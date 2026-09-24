#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:=ap-south-1}"
: "${EKS_CLUSTER:=streamflix-dev}"
: "${ECR_REGISTRY:?Set ECR_REGISTRY}"
: "${IMAGE_TAG:?Set IMAGE_TAG}"
: "${API_URL:=}"
: "${MEDIA_PUBLIC_BASE_URL:=}"
: "${S3_BUCKET:?Set S3_BUCKET}"
: "${API_ROLE_ARN:?Set API_ROLE_ARN}"
: "${WORKER_ROLE_ARN:?Set WORKER_ROLE_ARN}"
aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER"
helm upgrade --install streamflix ./helm/streamflix \
  --namespace streamflix --create-namespace \
  -f ./helm/streamflix/values-dev.yaml \
  --set api.image.repository="$ECR_REGISTRY/streamflix/api" --set api.image.tag="$IMAGE_TAG" \
  --set web.image.repository="$ECR_REGISTRY/streamflix/web" --set web.image.tag="$IMAGE_TAG" \
  --set worker.image.repository="$ECR_REGISTRY/streamflix/worker" --set worker.image.tag="$IMAGE_TAG" \
  --set config.apiUrl="$API_URL" --set config.mediaPublicBaseUrl="$MEDIA_PUBLIC_BASE_URL" \
  --set config.s3Bucket="$S3_BUCKET" \
  --set externalSecrets.enabled=true \
  --set externalSecrets.secretName="streamflix/dev/app" \
  --set serviceAccounts.apiRoleArn="$API_ROLE_ARN" \
  --set serviceAccounts.workerRoleArn="$WORKER_ROLE_ARN"
kubectl get pods -n streamflix
kubectl get ingress -n streamflix

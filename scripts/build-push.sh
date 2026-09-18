#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:=ap-south-1}"
: "${ECR_REGISTRY:?Set ECR_REGISTRY}"
: "${TAG:=$(git rev-parse --short HEAD)}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker build -t "$ECR_REGISTRY/streamflix/api:$TAG" ./apps/api
docker build -t "$ECR_REGISTRY/streamflix/web:$TAG" ./apps/web
docker build -t "$ECR_REGISTRY/streamflix/worker:$TAG" ./apps/worker
docker push "$ECR_REGISTRY/streamflix/api:$TAG"
docker push "$ECR_REGISTRY/streamflix/web:$TAG"
docker push "$ECR_REGISTRY/streamflix/worker:$TAG"

#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:=ap-south-1}"
: "${EKS_CLUSTER:=streamflix-dev}"
: "${LBC_ROLE_ARN:?Set LBC_ROLE_ARN}"
helm repo add eks https://aws.github.io/eks-charts
helm repo update
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master"
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="${EKS_CLUSTER}" \
  --set region="${AWS_REGION}" \
  --set vpcId="$(aws eks describe-cluster --name "${EKS_CLUSTER}" --region "${AWS_REGION}" --query 'cluster.resourcesVpcConfig.vpcId' --output text)" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${LBC_ROLE_ARN}"
kubectl rollout status deployment/aws-load-balancer-controller -n kube-system --timeout=5m

#!/usr/bin/env bash
set -euo pipefail
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace --set installCRDs=true
kubectl rollout status deployment/external-secrets -n external-secrets --timeout=5m

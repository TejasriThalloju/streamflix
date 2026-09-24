#!/usr/bin/env bash
set -euo pipefail
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args[0]=--kubelet-preferred-address-types=InternalIP
kubectl rollout status deployment/metrics-server -n kube-system --timeout=5m

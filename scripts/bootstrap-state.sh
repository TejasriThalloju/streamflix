#!/usr/bin/env bash
set -euo pipefail
: "${AWS_REGION:=ap-south-1}"
: "${TF_STATE_BUCKET:?Set TF_STATE_BUCKET}"
cd infrastructure/bootstrap
terraform init
terraform apply -var="region=$AWS_REGION" -var="state_bucket=$TF_STATE_BUCKET" -var="lock_table=${TF_LOCK_TABLE:-streamflix-terraform-lock}"

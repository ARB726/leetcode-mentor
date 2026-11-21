#!/usr/bin/env bash
set -euo pipefail
export AWS_PAGER=""
readonly STACK=leetcode-mentor
readonly ACCOUNT=675345028735
[[ "${AWS_REGION:-}" == us-east-2 ]]
[[ "${RELEASE_SHA:-}" =~ ^[0-9a-f]{40}$ ]]
[[ "${CF_DEPLOY_ROLE:-}" == arn:aws:iam::${ACCOUNT}:role/leetcode-mentor-* ]]
[[ "$(aws sts get-caller-identity --query Account --output text)" == "$ACCOUNT" ]]

aws cloudformation describe-stacks --stack-name "$STACK" > /tmp/mentor-stack.json
output() { jq -er --arg key "$1" '.Stacks[0].Outputs[] | select(.OutputKey == $key) | .OutputValue' /tmp/mentor-stack.json; }
repository=$(output RepositoryUri)
endpoint=$(output Endpoint)
[[ "$repository" == "${ACCOUNT}.dkr.ecr.us-east-2.amazonaws.com/leetcode-mentor-"* ]]
[[ "$endpoint" =~ ^https://[a-z0-9-]+\.ecs\.us-east-2\.on\.aws$ ]]
status=$(jq -r '.Stacks[0].StackStatus' /tmp/mentor-stack.json)
[[ "$status" == CREATE_COMPLETE || "$status" == UPDATE_COMPLETE || "$status" == UPDATE_ROLLBACK_COMPLETE ]]
previous=$(jq -er '.Stacks[0].Parameters[] | select(.ParameterKey == "ImageUri") | .ParameterValue' /tmp/mentor-stack.json)
image="${repository}:web-${RELEASE_SHA}"

# Build every time; only reuse an immutable tag after confirming it exists.
docker build --platform linux/amd64 -t "$image" web
docker run -d --name mentor-release -p 8501:8501 "$image"
trap 'docker logs mentor-release; docker rm -f mentor-release' EXIT
curl --fail --retry 20 --retry-connrefused --retry-delay 2 http://localhost:8501/_stcore/health
curl --fail --output /tmp/mentor-local.html http://localhost:8501/
grep -q 'Practice studio' /tmp/mentor-local.html
aws ecr get-login-password | docker login --username AWS --password-stdin "${repository%%/*}"
if ! aws ecr describe-images --repository-name "${repository#*/}" --image-ids "imageTag=web-${RELEASE_SHA}" > /tmp/mentor-image.json 2>/tmp/mentor-image-error; then
  # Permission/network failures must not masquerade as an absent image.
  grep -q ImageNotFoundException /tmp/mentor-image-error || { cat /tmp/mentor-image-error >&2; exit 1; }
  docker push "$image"
fi

update_image() {
  jq --arg image "$1" '[.Stacks[0].Parameters[] | if .ParameterKey == "ImageUri" then {ParameterKey: .ParameterKey, ParameterValue: $image} else {ParameterKey: .ParameterKey, UsePreviousValue: true} end]' /tmp/mentor-stack.json > /tmp/mentor-parameters.json
  aws cloudformation update-stack --stack-name "$STACK" --use-previous-template \
    --parameters file:///tmp/mentor-parameters.json --capabilities CAPABILITY_IAM \
    --role-arn "$CF_DEPLOY_ROLE"
  aws cloudformation wait stack-update-complete --stack-name "$STACK"
}
if [[ "$previous" != "$image" ]]; then update_image "$image"; fi
if ! curl --fail --max-time 15 --retry 8 --retry-delay 5 "$endpoint/_stcore/health" ||
   ! curl --fail --max-time 15 --output /tmp/mentor-public.html "$endpoint/" ||
   ! grep -q 'Practice studio' /tmp/mentor-public.html; then
  if [[ "$previous" != "$image" ]]; then update_image "$previous"; fi
  echo 'Release smoke check failed; previous image restored where applicable.' >&2
  exit 1
fi
printf 'Deployed `%s` to %s\n\nPrevious image: `%s`\n' "$image" "$endpoint" "$previous" >> "$GITHUB_STEP_SUMMARY"

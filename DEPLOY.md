# Cloud deployment

This is a Python Streamlit service, not a static site. The AWS template runs one Fargate task behind an HTTPS application load balancer. It requires an existing VPC, at least two public subnets in different availability zones, an issued ACM certificate, an ECR repository, and a Secrets Manager secret. Source migrations through Launch with AWS are not needed for this container path.

## Local preview

```powershell
uv venv .venv --python 3.12
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
./.venv/Scripts/python.exe -m streamlit run app.py
```

Set `GROQ_API_KEY` in an ignored `.env` file or `.streamlit/secrets.toml`. The UI opens without a key; AI buttons need one. Existing GitHub credentials are not required by the web app.

## Build and deploy to AWS

1. Sign in with AWS CLI and verify the account using `aws sts get-caller-identity`. Select a region and create a private ECR repository in it. Store the raw Groq key as a Secrets Manager **plaintext** secret using the default AWS-managed encryption key. Do not commit the key or pass it on a command line.
2. Build and push the image using the ECR console's **View push commands**. Use the current Git commit SHA as the image tag. The Docker build context uses an allowlist; `.env`, Git history, virtual environments, and Streamlit secrets are excluded. Build for `linux/amd64` when using an ARM machine.
3. Validate the template: `cfn-lint deploy/ecs.yaml` and `aws cloudformation validate-template --template-body file://deploy/ecs.yaml`.
4. In CloudFormation, create a stack from `deploy/ecs.yaml`, supplying the VPC, public subnet IDs, immutable image URI, certificate ARN, and secret ARN. Acknowledge creation of the execution IAM role. Subnets must have an internet gateway route; the task needs outbound internet access to reach Groq. The default ECS service-linked role must exist or your deployer must be allowed to create it.
5. Create a DNS alias or CNAME from the certificate's domain to the stack's `LoadBalancerDns` output. Open **your domain** using HTTPS; the raw ALB hostname will not match your certificate.
6. Check `https://YOUR_DOMAIN/_stcore/health`, load the example, and run one review and coaching request. Confirm the report downloads and results survive widget reruns. Watch ECS task logs for failures.

The stack creates billable ALB, Fargate, public IPv4, and CloudWatch resources; Secrets Manager, ECR, data transfer, and Groq usage are additional. Check current regional pricing before creating it. This repo has not yet been deployed or account-validated. It supplies no persistent user database or sign-in: session progress resets on refresh/restart. A public deployment exposes the server-funded AI buttons; restrict access to your demo audience and set provider spend limits before sharing widely.

## Updates and rollback

Push a new commit-tagged image and update only `ImageUri` in the stack. ECS deployment circuit breaker rolls back failed deployments; keep the previous image tag for manual rollback. New deployments end existing in-memory sessions. After rotating the secret, force a new ECS deployment to pick up the value. Delete the stack to stop task and load-balancer costs; the log group is retained intentionally and ECR/Secrets Manager are managed separately.

## Small PR order

1. `feat/mentor-workspace` → `main`: workspace, theme, session results, tests.
2. `feat/interview-coach` → `feat/mentor-workspace`: structured AI rehearsal.
3. `chore/cloud-deployment` → `feat/interview-coach`: container, AWS template, CI, and deployment guide.

Retarget each dependent PR to `main` after its predecessor merges.

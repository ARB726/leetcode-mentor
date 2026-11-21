# Next.js on the existing isolated AWS stack

The web release reuses only the `leetcode-mentor` CloudFormation stack in account `675345028735`, region `us-east-2`. It retains the dedicated VPC, cluster, repository, existing Groq secret and HTTPS endpoint. It does not use System Design Simulator resources or roles. Next.js replaces Streamlit inside the Mentor service; the root Streamlit source remains available for rollback.

From the repository root, using the dedicated AWS profile:

```powershell
./.venv/Scripts/python.exe deploy/aws_live.py build --web --profile leetcode-mentor --expected-account 675345028735
./.venv/Scripts/python.exe deploy/aws_live.py status --web --profile leetcode-mentor --expected-account 675345028735
# Wait for SUCCEEDED, then:
./.venv/Scripts/python.exe deploy/aws_live.py launch --web --profile leetcode-mentor --expected-account 675345028735
```

The helper explicitly archives only runtime web sources and dependency manifests, excluding local environments, secrets, tests, benchmark outputs, and node_modules. The existing CodeBuild project builds the production Docker image. `--web` reuses the existing provider secret unchanged and records its state separately in `.venv/aws-web-deployment.json`. Launch refuses sources that changed after the build, preserves other stack parameters, and reuses the deployed template.

Wait for `UPDATE_COMPLETE`. Check `/_stcore/health`, open the practice studio, and run one Quick review and one Deep review. Deep review should stream six specialists and a synthesis stage. Provider errors remain visible; a partial review is not a successful seven-stage run. The browser's Print / PDF action prints the entire review rather than only the selected tab.

The previous image is saved before an update. To request a rollback:

```powershell
./.venv/Scripts/python.exe deploy/aws_live.py rollback --web --profile leetcode-mentor --expected-account 675345028735
```

Wait for completion and repeat the endpoint checks. The helper does not automatically claim success after submitting an update. CloudFormation rollback behavior applies if an update fails.

## Branded URL

The existing AWS-generated HTTPS hostname remains valid after changing containers. It cannot become an arbitrary branded domain through an application setting. To publish a name such as `mentor.yourdomain.com`, first identify a domain you own, its DNS provider, and an approved subdomain. A separate reviewed change can configure the custom hostname, certificate, and DNS records. This release does not register a paid domain, repurpose a simulator hostname, or modify existing DNS.

## Benchmark evidence

The 50-problem corpus and resumable runner are documented in `web/benchmarks/README.md`. Simulated scheduler measurements do not substantiate real-provider performance. Do not claim a 60% AI speedup unless the complete live benchmark and its quality review support it.

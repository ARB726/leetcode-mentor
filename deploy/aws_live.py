"""Deploy only the named LeetCode Mentor stack using an explicit AWS profile."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
STACK = "leetcode-mentor"
STATE = ROOT / ".venv" / "aws-deployment.json"


def source_archive():
    paths = ["Dockerfile", ".dockerignore", "requirements.txt", "app.py", "main.py", "pdf_export.py", ".streamlit/config.toml"]
    paths += [str(path.relative_to(ROOT)).replace("\\", "/") for path in sorted((ROOT / "agents").glob("*.py"))]
    buffer = io.BytesIO()
    digest = hashlib.sha256()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in paths:
            content = (ROOT / name).read_bytes()
            digest.update(name.encode() + b"\0" + content)
            archive.writestr(name, content)
    return buffer.getvalue(), digest.hexdigest()[:20]


def stack_details(cf):
    stack = cf.describe_stacks(StackName=STACK)["Stacks"][0]
    outputs = {item["OutputKey"]: item["OutputValue"] for item in stack.get("Outputs", [])}
    return stack, outputs


def deploy(session, command):
    config = Config(retries={"mode": "standard", "max_attempts": 5}, connect_timeout=10, read_timeout=30)
    cf = session.client("cloudformation", config=config)
    template = (ROOT / "deploy" / "express.yaml").read_text(encoding="utf-8")
    if command == "prepare":
        try:
            stack, _ = stack_details(cf)
        except cf.exceptions.ClientError as error:
            if "does not exist" not in error.response["Error"]["Message"]:
                raise
            result = cf.create_stack(StackName=STACK, TemplateBody=template,
                                     Capabilities=["CAPABILITY_IAM"],
                                     Tags=[{"Key": "Project", "Value": "leetcode-mentor"}])
            print(json.dumps({"created_stack": result["StackId"]}))
        else:
            print(json.dumps({"stack_status": stack["StackStatus"]}))
        return
    stack, outputs = stack_details(cf)
    if command == "status":
        print(json.dumps({"stack_status": stack["StackStatus"], "outputs": outputs}, indent=2))
        if STATE.exists():
            state = json.loads(STATE.read_text())
            if state.get("build_id"):
                build = session.client("codebuild", config=config).batch_get_builds(ids=[state["build_id"]])["builds"][0]
                print(json.dumps({"build_status": build["buildStatus"], "phase": build["currentPhase"], "logs": build.get("logs", {}).get("deepLink")}))
        return
    if command == "events":
        events = cf.describe_stack_events(StackName=STACK)["StackEvents"][:15]
        print(json.dumps([{key: event.get(key) for key in ["LogicalResourceId", "ResourceStatus", "ResourceStatusReason"]} for event in events], indent=2))
        return
    if command == "build":
        if stack["StackStatus"] not in ["CREATE_COMPLETE", "UPDATE_COMPLETE"]:
            raise ValueError("Wait for the stack to finish before starting a build")
        key = dotenv_values(ROOT / ".env").get("GROQ_API_KEY")
        if not key:
            raise ValueError("Missing GROQ_API_KEY in local .env")
        # The secret is transmitted over TLS and is never written to the source archive or logs.
        session.client("secretsmanager", config=config).put_secret_value(SecretId=outputs["SecretArn"], SecretString=key)
        archive, tag = source_archive()
        location = f"source/{tag}.zip"
        session.client("s3", config=config).put_object(Bucket=outputs["SourceBucket"], Key=location, Body=archive, ServerSideEncryption="AES256")
        image = outputs["RepositoryUri"] + ":" + tag
        result = session.client("codebuild", config=config).start_build(
            projectName=outputs["BuildProject"], sourceLocationOverride=outputs["SourceBucket"] + "/" + location,
            environmentVariablesOverride=[{"name": "IMAGE_URI", "value": image, "type": "PLAINTEXT"},
                                          {"name": "REGISTRY", "value": image.split("/")[0], "type": "PLAINTEXT"}])
        STATE.parent.mkdir(exist_ok=True)
        STATE.write_text(json.dumps({"build_id": result["build"]["id"], "image_uri": image}), encoding="utf-8")
        print(json.dumps({"build_id": result["build"]["id"], "image_uri": image}))
        return
    if command == "launch":
        state = json.loads(STATE.read_text())
        build = session.client("codebuild", config=config).batch_get_builds(ids=[state["build_id"]])["builds"][0]
        if build["buildStatus"] != "SUCCEEDED":
            raise ValueError("Container build must succeed before launch")
        result = cf.update_stack(StackName=STACK, TemplateBody=template, Capabilities=["CAPABILITY_IAM"],
                                 Parameters=[{"ParameterKey": "ImageUri", "ParameterValue": state["image_uri"]}])
        print(json.dumps({"updating_stack": result["StackId"]}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["prepare", "status", "events", "build", "launch"])
    parser.add_argument("--profile", required=True)
    parser.add_argument("--expected-account", required=True)
    parser.add_argument("--region", default="us-east-2")
    args = parser.parse_args()
    if args.profile != "leetcode-mentor":
        parser.error("This deployment requires the dedicated leetcode-mentor profile")
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    identity = session.client("sts").get_caller_identity()
    if identity["Account"] != args.expected_account:
        parser.error("AWS account does not match --expected-account")
    try:
        deploy(session, args.command)
    except (ClientError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

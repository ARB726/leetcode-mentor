import json
from types import SimpleNamespace
import pytest

from deploy import aws_live


def test_web_launch_preserves_template_parameters_and_records_rollback(monkeypatch, tmp_path):
    state_path = tmp_path / ".venv" / "aws-web-deployment.json"
    state_path.parent.mkdir()
    state_path.write_text(json.dumps({"image_uri": "registry/mentor:web-hash", "build_id": "mentor-build"}))
    calls = []
    cloudformation = SimpleNamespace(update_stack=lambda **kwargs: calls.append(kwargs) or {"StackId": "mentor-stack"})
    builder = SimpleNamespace(batch_get_builds=lambda **kwargs: {"builds": [{"buildStatus": "SUCCEEDED"}]})
    session = SimpleNamespace(client=lambda service, **kwargs: cloudformation if service == "cloudformation" else builder)
    (tmp_path / "deploy").mkdir()
    (tmp_path / "deploy" / "express.yaml").write_text("unused deployed template")
    monkeypatch.setattr(aws_live, "ROOT", tmp_path)
    monkeypatch.setattr(aws_live, "source_archive", lambda **kwargs: (b"", "web-hash"))
    monkeypatch.setattr(aws_live, "stack_details", lambda cf: ({"Parameters": [{"ParameterKey": "ImageUri", "ParameterValue": "old-image"}, {"ParameterKey": "KeepMe", "ParameterValue": "unchanged"}]}, {}))
    aws_live.deploy(session, "launch", web=True)
    assert calls[0]["StackName"] == "leetcode-mentor"
    assert calls[0]["UsePreviousTemplate"] is True
    assert "TemplateBody" not in calls[0]
    assert {"ParameterKey": "KeepMe", "UsePreviousValue": True} in calls[0]["Parameters"]
    assert json.loads(state_path.read_text())["previous_image_uri"] == "old-image"
    monkeypatch.setattr(aws_live, "stack_details", lambda cf: ({"Parameters": [{"ParameterKey": "ImageUri", "ParameterValue": "registry/mentor:web-hash"}, {"ParameterKey": "KeepMe", "ParameterValue": "unchanged"}]}, {}))
    aws_live.deploy(session, "rollback", web=True)
    assert {"ParameterKey": "ImageUri", "ParameterValue": "old-image"} in calls[1]["Parameters"]


def test_supabase_configuration_rejects_administrative_keys(monkeypatch, tmp_path):
    monkeypatch.setattr(aws_live, "ROOT", tmp_path)
    config = tmp_path / ".env"
    config.write_text("SUPABASE_URL=https://dedicated-mentor.supabase.co\nSUPABASE_PUBLISHABLE_KEY=sb_secret_never_ship\n")
    with pytest.raises(ValueError, match="never secret"):
        aws_live.public_supabase_values()
    config.write_text("SUPABASE_URL=https://dedicated-mentor.supabase.co\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n")
    assert aws_live.public_supabase_values()[0] == "https://dedicated-mentor.supabase.co"


def test_supabase_change_set_refuses_other_resources_and_replacements(monkeypatch, tmp_path):
    monkeypatch.setattr(aws_live, "ROOT", tmp_path)
    (tmp_path / "deploy").mkdir()
    (tmp_path / "deploy" / "express.yaml").write_text("unused template")
    (tmp_path / ".venv").mkdir()
    (tmp_path / ".venv" / "aws-web-deployment.json").write_text(json.dumps({"supabase_change_set": "mentor-config"}))
    detail = {"StackName": "leetcode-mentor", "Status": "CREATE_COMPLETE", "ExecutionStatus": "AVAILABLE", "Changes": [{"ResourceChange": {"LogicalResourceId": "Vpc", "ResourceType": "AWS::EC2::VPC", "Action": "Modify", "Replacement": "False"}}]}
    executed = []
    cf = SimpleNamespace(describe_change_set=lambda **kwargs: detail, execute_change_set=lambda **kwargs: executed.append(kwargs))
    session = SimpleNamespace(client=lambda *args, **kwargs: cf)
    monkeypatch.setattr(aws_live, "stack_details", lambda cf: ({}, {}))
    with pytest.raises(ValueError, match="Refusing"):
        aws_live.deploy(session, "apply-supabase", web=True)
    assert not executed
    detail["Changes"][0]["ResourceChange"].update(LogicalResourceId="App", ResourceType="AWS::ECS::ExpressGatewayService", Replacement="True")
    with pytest.raises(ValueError, match="Refusing"):
        aws_live.deploy(session, "apply-supabase", web=True)
    detail["Changes"][0]["ResourceChange"]["Replacement"] = "False"
    aws_live.deploy(session, "apply-supabase", web=True)
    assert executed == [{"StackName": "leetcode-mentor", "ChangeSetName": "mentor-config"}]

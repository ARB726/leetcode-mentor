import json
from types import SimpleNamespace

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

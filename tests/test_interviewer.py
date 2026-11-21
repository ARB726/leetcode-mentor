import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from pydantic import ValidationError
from agents.interviewer import coach_interview


def test_coach_validates_output_and_sends_actual_code():
    payload = dict(explanation="Explain the nested loops", tradeoff="Time for simplicity", follow_up="What about duplicate values?", next_rep="Try a hash map")
    client = Mock()
    choice = SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content=json.dumps(payload)))
    client.chat.completions.create.return_value = SimpleNamespace(choices=[choice])
    result = dict(problem="Two Sum", solution="nested loops", language="Python", review="Quadratic")
    assert coach_interview(client, result, "Backend engineer", "My reasoning").model_dump() == payload
    request = client.chat.completions.create.call_args.kwargs
    assert json.loads(request["messages"][1]["content"])["solution"] == "nested loops"
    assert request["response_format"]["json_schema"]["strict"] is True
    choice.message.content = '{}'
    with pytest.raises(ValidationError):
        coach_interview(client, result, "Backend engineer", "")
    choice.finish_reason = "length"
    with pytest.raises(ValueError, match="Incomplete"):
        coach_interview(client, result, "Backend engineer", "")

from pathlib import Path
from unittest.mock import patch
from streamlit.testing.v1 import AppTest


def test_workspace_example_validation_and_navigation():
    app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=15).run()
    assert not app.exception
    app.button[1].click().run()
    assert "Add both" in app.warning[0].value
    app.button(key="example").click().run()
    assert "Two Sum" in app.text_area(key="problem_input").value
    app.radio(key="page").set_value("Session progress").run()
    assert not app.exception
    assert app.metric[0].value == "0"


def test_review_persists_without_repeating_api_calls():
    response = {"problem": "Two Sum", "solution": "pass", "language": "Python",
                "analysis": "Constraints", "review": "Review", "optimized": "Optimized", "lesson": "Lesson"}
    with patch("agents.analyst.analyze_problem", return_value="Constraints") as analyze, \
         patch("agents.reviewer.review_code", return_value="Review"), \
         patch("agents.optimizer.optimize_solution", return_value="Optimized"), \
         patch("agents.teacher.teach_pattern", return_value="Lesson"), \
         patch.dict("os.environ", {"GROQ_API_KEY": "test-only"}):
        app = AppTest.from_file(Path(__file__).resolve().parents[1] / "app.py", default_timeout=15).run()
        app.button(key="example").click().run()
        app.button[1].click().run()
        assert not app.exception
        assert app.session_state["result"]["review"] == response["review"]
        app.selectbox(key="language_input").set_value("Java").run()
        assert app.session_state["result"]["language"] == "Python"
        assert analyze.call_count == 1


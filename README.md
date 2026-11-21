# LeetCode Mentor

A focused coding interview practice lab built with Python, Streamlit, and Groq.

Paste a problem and your solution to get a correctness review, an optimized approach, and a pattern lesson. Then rehearse your explanation with an AI interview coach that challenges your tradeoffs and suggests your next practice exercise.

## Run locally

```powershell
uv venv .venv --python 3.12
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
./.venv/Scripts/python.exe -m streamlit run app.py
```

Add `GROQ_API_KEY=your-key` to an ignored `.env` file. The workspace opens without credentials; reviews and coaching require a valid key. Code is sent to Groq only when you request AI feedback. Model output is guidance, not an executed correctness test.

## What makes the practice useful

- A complete loop from coding to explaining and handling changed constraints.
- Four review stages with correct review → optimization → teaching dependencies.
- Structured interview coaching grounded in the submitted code and your explanation.
- Session-scoped results that survive widget reruns and can be downloaded as Markdown.
- A session progress view with real practice counts rather than invented readiness scores.

The web app does not automatically publish solutions to GitHub. Progress is in memory and ends when the browser session or server restarts. The legacy CLI and PDF utilities remain in the repository.

## Tests

```powershell
uv pip install --python .venv/Scripts/python.exe pytest
./.venv/Scripts/python.exe -m pytest -q
```

Tests mock AI calls; they do not spend API credits. CI also validates the AWS template and builds the container.

## Cloud

See [DEPLOY.md](DEPLOY.md) for Docker preview, the AWS ECS/Fargate deployment, operational limits, and the three small PR branches. Cloud deployment requires account access and is not automatic.

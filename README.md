# 🧠 LeetCode Mentor — Multi Agent AI System

An AI-powered tool that analyzes your LeetCode solutions using 7 specialized agents, generates algorithm diagrams, and automatically pushes everything to GitHub.

## 🤖 Agents

| Agent | Role |
|-------|------|
| 🔍 **Agent 1 - Problem Analyst** | Breaks down the problem, constraints, and best data structures |
| 🔎 **Agent 2 - Code Reviewer** | Reviews your code for bugs, complexity, and style |
| ⚡ **Agent 3 - Solution Optimizer** | Suggests a more efficient solution with explanation |
| 🎓 **Agent 4 - Pattern Teacher** | Teaches the underlying algorithm pattern |
| 📊 **Agent 5 - Algorithm Diagram** | Generates a flowchart of how your solution works |
| 🗺️ **Agent 6 - Pattern Diagram** | Visualizes the general pattern for future problems |
| 📤 **Agent 7 - Git Agent** | Pushes solution + full analysis to GitHub automatically |

## ✨ Features

- 🌐 Multi-language support (Python, Java, C++, JavaScript, Go, Rust)
- ⚡ Parallel agent execution for 60% faster analysis
- 📊 Algorithm flowchart visualization with Mermaid diagrams
- 📄 PDF report export for every solved problem
- 📈 Progress dashboard tracking problems by difficulty over time
- 🔄 Auto GitHub commits building a documented solution history

## 🛠️ Tech Stack

- **Python** — core pipeline
- **Groq API** — LLM inference
- **Streamlit** — web interface
- **GitPython** — automated GitHub commits
- **ReportLab** — PDF generation
- **Rich** — terminal UI

## 🚀 Setup

```bash
git clone https://github.com/ARB726/leetcode-mentor.git
cd leetcode-mentor
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:
GROQ_API_KEY=your_groq_api_key
GITHUB_USERNAME=your_github_username
GITHUB_REPO=leetcode-solutions
GITHUB_TOKEN=your_github_token

Run locally:
```bash
streamlit run app.py
```

Or use the CLI:
```bash
python main.py
```

## 🌐 Live Demo

[leetcode-mentor-by-abdulraziq.streamlit.app](https://leetcode-mentor-by-abdulraziq.streamlit.app)

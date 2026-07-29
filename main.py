import os
import json
import asyncio
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
import git
import re

from agents.analyst import analyze_problem
from agents.reviewer import review_code
from agents.optimizer import optimize_solution
from agents.teacher import teach_pattern

load_dotenv()
console = Console()

def extract_problem_info(problem: str):
    difficulty = "unknown"
    for level in ["Easy", "Medium", "Hard"]:
        if level in problem:
            difficulty = level.lower()
            break
    lines = [l.strip() for l in problem.split("\n") if l.strip()]
    name = lines[0] if lines else "problem"
    name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    name = name.strip().lower().replace(" ", "-")
    return name, difficulty

def save_and_push_to_github(problem, solution, analysis, review, optimized, lesson, client=None):
    console.print("\n[bold green]📤 Agent 5: Saving and pushing to GitHub...[/bold green]")
    repo_path = os.path.join(os.path.expanduser("~"), "leetcode-solutions")
    token = os.getenv("GITHUB_TOKEN")
    username = os.getenv("GITHUB_USERNAME")
    repo_name = os.getenv("GITHUB_REPO")

    if not os.path.exists(repo_path):
        console.print(f"[yellow]Cloning repo to {repo_path}...[/yellow]")
        git.Repo.clone_from(
            f"https://{token}@github.com/{username}/{repo_name}.git",
            repo_path
        )

    repo = git.Repo(repo_path)
    problem_name, difficulty = extract_problem_info(problem)
    timestamp = datetime.now().strftime("%Y%m%d")
    folder_name = f"{problem_name}-{difficulty}-{timestamp}"
    folder = os.path.join(repo_path, folder_name)
    os.makedirs(folder, exist_ok=True)

    with open(os.path.join(folder, "solution.py"), "w") as f:
        f.write(f"# Problem\n\"\"\"\n{problem}\n\"\"\"\n\n# My Solution\n{solution}")

    with open(os.path.join(folder, "analysis.md"), "w") as f:
        f.write(f"# {problem_name.replace('-', ' ').title()} — {difficulty.title()}\n\n")
        f.write(f"## Problem\n{problem}\n\n")
        f.write(f"## Problem Analysis\n{analysis}\n\n")
        f.write(f"## Code Review\n{review}\n\n")
        f.write(f"## Optimized Solution\n{optimized}\n\n")
        f.write(f"## Lesson & Pattern\n{lesson}\n")

    progress_file = os.path.join(repo_path, "progress.json")
    progress = {}
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            progress = json.load(f)

    progress[folder_name] = {
        "problem": problem_name,
        "difficulty": difficulty,
        "date": timestamp,
        "folder": folder_name
    }

    with open(progress_file, "w") as f:
        json.dump(progress, f, indent=2)

    repo.git.add(A=True)
    repo.index.commit(f"Add {problem_name} ({difficulty})")
    repo.remotes.origin.push()
    console.print(f"[bold green]✅ Pushed to GitHub as '{folder_name}'![/bold green]")

def run_pipeline(problem: str, solution: str, client: Groq):
    console.print(Panel.fit("🧠 LeetCode Mentor - Multi Agent System", style="bold blue"))
    analysis = analyze_problem(client, problem)
    console.print(Panel(Markdown(analysis), title="📋 Problem Analysis", border_style="blue"))
    review = review_code(client, problem, solution, analysis)
    console.print(Panel(Markdown(review), title="🔎 Code Review", border_style="yellow"))
    optimized = optimize_solution(client, problem, solution, review)
    console.print(Panel(Markdown(optimized), title="⚡ Optimized Solution", border_style="green"))
    lesson = teach_pattern(client, problem, solution, optimized)
    console.print(Panel(Markdown(lesson), title="🎓 Lesson & Pattern", border_style="magenta"))
    save_and_push_to_github(problem, solution, analysis, review, optimized, lesson)

if __name__ == "__main__":
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    console.print("[bold]Paste your LeetCode problem (type END on a new line when done):[/bold]")
    lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        lines.append(line)
    problem = "\n".join(lines)

    console.print("\n[bold]Paste your solution (type END on a new line when done):[/bold]")
    lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        lines.append(line)
    solution = "\n".join(lines)

    run_pipeline(problem, solution, client)
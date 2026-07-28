import os
import json
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
import git

from agents.analyst import analyze_problem
from agents.reviewer import review_code
from agents.optimizer import optimize_solution
from agents.teacher import teach_pattern

load_dotenv()
console = Console()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def save_and_push_to_github(problem: str, solution: str, analysis: str, review: str, optimized: str, lesson: str):
    console.print("\n[bold green]📤 Agent 5: Saving and pushing to GitHub...[/bold green]")
    
    repo_path = os.path.join(os.path.expanduser("~"), "leetcode-solutions")
    
    if not os.path.exists(repo_path):
        console.print(f"[yellow]Cloning repo to {repo_path}...[/yellow]")
        git.Repo.clone_from(
            f"https://{os.getenv('GITHUB_TOKEN')}@github.com/{os.getenv('GITHUB_USERNAME')}/{os.getenv('GITHUB_REPO')}.git",
            repo_path
        )
    
    repo = git.Repo(repo_path)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = os.path.join(repo_path, f"solution_{timestamp}")
    os.makedirs(folder, exist_ok=True)
    
    # Save solution
    with open(os.path.join(folder, "solution.py"), "w") as f:
        f.write(f"# Problem\n\"\"\"\n{problem}\n\"\"\"\n\n# My Solution\n{solution}")
    
    # Save full analysis as markdown
    with open(os.path.join(folder, "analysis.md"), "w") as f:
        f.write(f"# LeetCode Analysis - {timestamp}\n\n")
        f.write(f"## Problem\n{problem}\n\n")
        f.write(f"## Problem Analysis\n{analysis}\n\n")
        f.write(f"## Code Review\n{review}\n\n")
        f.write(f"## Optimized Solution\n{optimized}\n\n")
        f.write(f"## Lesson & Pattern\n{lesson}\n")
    
    repo.git.add(A=True)
    repo.index.commit(f"Add solution {timestamp}")
    repo.remotes.origin.push()
    
    console.print(f"[bold green]✅ Pushed to GitHub! Check your repo.[/bold green]")

def run_pipeline(problem: str, solution: str):
    console.print(Panel.fit("🧠 LeetCode Mentor - Multi Agent System", style="bold blue"))
    
    # Run all 4 agents in sequence
    analysis = analyze_problem(client, problem)
    console.print(Panel(Markdown(analysis), title="📋 Problem Analysis", border_style="blue"))
    
    review = review_code(client, problem, solution, analysis)
    console.print(Panel(Markdown(review), title="🔎 Code Review", border_style="yellow"))
    
    optimized = optimize_solution(client, problem, solution, review)
    console.print(Panel(Markdown(optimized), title="⚡ Optimized Solution", border_style="green"))
    
    lesson = teach_pattern(client, problem, solution, optimized)
    console.print(Panel(Markdown(lesson), title="🎓 Lesson & Pattern", border_style="magenta"))
    
    # Agent 5: push to GitHub
    save_and_push_to_github(problem, solution, analysis, review, optimized, lesson)

if __name__ == "__main__":
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
    
    run_pipeline(problem, solution)
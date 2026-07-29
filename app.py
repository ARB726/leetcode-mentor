import streamlit as st
import os
import json
import pandas as pd
from groq import Groq
from dotenv import load_dotenv
from agents.analyst import analyze_problem
from agents.reviewer import review_code
from agents.optimizer import optimize_solution
from agents.teacher import teach_pattern
from main import save_and_push_to_github, run_agents_parallel
import asyncio
from pdf_export import export_to_pdf
from main import extract_problem_info

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

st.set_page_config(page_title="LeetCode Mentor", page_icon="🧠", layout="wide")

# Sidebar navigation
page = st.sidebar.selectbox("Navigate", ["🧠 Mentor", "📊 Dashboard"])

if page == "🧠 Mentor":
    st.title("🧠 LeetCode Mentor — Multi Agent System")
    st.markdown("Paste your LeetCode problem and solution, and 5 AI agents will analyze it and push to GitHub!")

    col1, col2 = st.columns(2)
    with col1:
        problem = st.text_area("📋 Paste LeetCode Problem", height=300, placeholder="Paste the full problem here...")
    with col2:
        solution = st.text_area("💻 Paste Your Solution", height=300, placeholder="Paste your code here...")

    if st.button("🚀 Run Agents", type="primary", use_container_width=True):
        if not problem or not solution:
            st.error("Please paste both the problem and your solution!")
        else:
            with st.spinner("🔍 Agent 1: Analyzing problem..."):
                analysis = analyze_problem(client, problem)
            st.success("✅ Agent 1 Done!")
            with st.expander("📋 Problem Analysis", expanded=True):
                st.markdown(analysis)

            with st.spinner("⚡ Running Agents 2, 3 & 4 in parallel..."):
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    review_future = executor.submit(review_code, client, problem, solution, analysis)
                    optimize_future = executor.submit(optimize_solution, client, problem, solution, analysis)
                    teach_future = executor.submit(teach_pattern, client, problem, solution, analysis)
                    review = review_future.result()
                    optimized = optimize_future.result()
                    lesson = teach_future.result()

            st.success("✅ Agents 2, 3 & 4 Done!")

            col_a, col_b = st.columns(2)
            with col_a:
                with st.expander("🔎 Code Review", expanded=True):
                    st.markdown(review)
                with st.expander("🎓 Lesson & Pattern", expanded=True):
                    st.markdown(lesson)
            with col_b:
                with st.expander("⚡ Optimized Solution", expanded=True):
                    st.markdown(optimized)

                # Copy button for optimized solution
                st.code(optimized, language="python")

            with st.spinner("📤 Agent 5: Pushing to GitHub..."):
                save_and_push_to_github(problem, solution, analysis, review, optimized, lesson)
            st.success("✅ Pushed to GitHub!")
            st.balloons()
            st.markdown(f"### 🎉 [View on GitHub](https://github.com/{os.getenv('GITHUB_USERNAME')}/{os.getenv('GITHUB_REPO')})")
            # PDF Export
            problem_name, difficulty = extract_problem_info(problem)
            pdf_bytes = export_to_pdf(problem_name, problem, solution, analysis, review, optimized, lesson)
            st.download_button(
            label="📄 Download PDF Report",
            data=pdf_bytes,
            file_name=f"{problem_name}-{difficulty}-analysis.pdf",
            mime="application/pdf",
            use_container_width=True
)

elif page == "📊 Dashboard":
    st.title("📊 Your LeetCode Progress")

    progress_file = os.path.join(os.path.expanduser("~"), "leetcode-solutions", "progress.json")

    if not os.path.exists(progress_file):
        st.warning("No progress data yet! Solve some problems first.")
    else:
        with open(progress_file, "r") as f:
            progress = json.load(f)

        if not progress:
            st.warning("No problems solved yet!")
        else:
            df = pd.DataFrame(progress.values())

            # Stats row
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total Solved", len(df))
            col2.metric("Easy", len(df[df["difficulty"] == "easy"]))
            col3.metric("Medium", len(df[df["difficulty"] == "medium"]))
            col4.metric("Hard", len(df[df["difficulty"] == "hard"]))

            st.divider()

            # Difficulty chart
            st.subheader("Problems by Difficulty")
            diff_counts = df["difficulty"].value_counts()
            st.bar_chart(diff_counts)

            st.divider()

            # Problems solved over time
            st.subheader("Problems Solved Over Time")
            df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")
            timeline = df.groupby("date").size().cumsum()
            st.line_chart(timeline)

            st.divider()

            # Full problem list
            st.subheader("All Solved Problems")
            st.dataframe(
                df[["problem", "difficulty", "date"]].sort_values("date", ascending=False),
                use_container_width=True
            )
"""An interview practice workspace with session-scoped AI feedback."""
import os
import streamlit as st
from dotenv import load_dotenv
from groq import Groq
from agents.analyst import analyze_problem
from agents.reviewer import review_code
from agents.optimizer import optimize_solution
from agents.teacher import teach_pattern
from main import extract_problem_info

load_dotenv()
st.set_page_config(page_title="LeetCode Mentor | Interview lab", page_icon="✦", layout="wide")


def get_secret(key):
    try:
        return st.secrets[key]
    except (KeyError, FileNotFoundError):
        return os.getenv(key)


def run_review(client, problem, solution, language):
    analysis = analyze_problem(client, problem, language)
    review = review_code(client, problem, solution, analysis, language)
    optimized = optimize_solution(client, problem, solution, review, language)
    lesson = teach_pattern(client, problem, solution, optimized, language)
    return dict(problem=problem, solution=solution, language=language, analysis=analysis,
                review=review, optimized=optimized, lesson=lesson)


st.session_state.setdefault("history", [])
with st.sidebar:
    st.markdown("## ✦ LeetCode Mentor")
    st.caption("YOUR INTERVIEW PRACTICE LAB")
    page = st.radio("Workspace", ["Practice", "Session progress"], key="page", label_visibility="collapsed")
    st.divider()
    st.markdown("**Practice with intention**")
    st.caption("1. Solve before revealing feedback\n\n2. Defend your tradeoffs\n\n3. Practice a follow-up")
    st.divider()
    st.caption("Your work stays in this browser session. Download a report before leaving. Submitted code is sent to Groq when you request AI feedback.")

if page == "Session progress":
    st.title("Every rep has a purpose.")
    st.caption("Reviews completed in this session. Practice counts are not hiring predictions.")
    history = st.session_state.history
    cols = st.columns(3)
    cols[0].metric("Reviews completed", len(history))
    cols[1].metric("Languages practiced", len({item["language"] for item in history}))
    cols[2].metric("Problems explored", len({item["problem"] for item in history}))
    if history:
        st.dataframe(history, hide_index=True, width="stretch")
    else:
        st.info("Your first review starts your practice log. Open Practice to get started.")
    st.stop()

st.caption("THINK CLEARLY. CODE CONFIDENTLY.")
st.title("Turn your next solution into your next breakthrough.")
st.markdown("A focused workspace to **review your code**, understand the pattern, and explain the decisions behind it.")
st.divider()
left, right = st.columns([3, 1], vertical_alignment="bottom")
with left:
    st.subheader("Your next practice rep")
with right:
    if st.button("Try an example", key="example", width="stretch"):
        st.session_state.problem_input = "Two Sum\nEasy\nGiven integers nums and target, return indices of two distinct numbers that add up to target. Exactly one solution exists.\nExample: nums = [2, 7, 11, 15], target = 9 => [0, 1]"
        st.session_state.solution_input = "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]"
        st.session_state.language_input = "Python"

language = st.selectbox("Language", ["Python", "Java", "C++", "JavaScript", "Go", "Rust", "TypeScript"], key="language_input")
with st.form("practice"):
    col1, col2 = st.columns(2)
    with col1:
        st.caption("01 / THE CHALLENGE")
        problem = st.text_area("Problem and constraints", height=260, key="problem_input", placeholder="Paste the problem, examples, and constraints…")
    with col2:
        st.caption("02 / YOUR APPROACH")
        solution = st.text_area("Your solution", height=260, key="solution_input", placeholder="Paste your code. A first attempt is a good starting point.")
    submitted = st.form_submit_button("Review my solution →", type="primary", width="stretch")

if submitted:
    if not problem.strip() or not solution.strip():
        st.warning("Add both a problem and your solution to start a review.")
    elif len(problem) + len(solution) > 24000:
        st.warning("Keep the combined problem and solution under 24,000 characters.")
    elif not get_secret("GROQ_API_KEY"):
        st.info("Configure GROQ_API_KEY on the server to enable AI reviews.")
    else:
        try:
            with st.status("Reviewing your reasoning and code…", expanded=True) as status:
                st.write("Analyzing constraints, reviewing correctness, and preparing a pattern lesson.")
                result = run_review(Groq(api_key=get_secret("GROQ_API_KEY"), timeout=60, max_retries=1), problem, solution, language)
                status.update(label="Your review is ready", state="complete", expanded=False)
            st.session_state.result = result
            st.session_state.pop("coaching", None)
            name, difficulty = extract_problem_info(problem)
            st.session_state.history.append({"problem": name, "difficulty": difficulty, "language": language})
        except Exception:
            st.error("The AI review could not finish. Check the server API key, quota, and connection, then retry. Your inputs are still here.")

if "result" in st.session_state:
    result = st.session_state.result
    st.divider()
    st.subheader("Make the feedback your next move")
    st.caption("Last completed submission · " + result["language"] + " · AI feedback can contain mistakes; verify claims with tests.")
    tabs = st.tabs(["Code review", "Better approach", "Learn the pattern", "Problem breakdown"])
    for tab, field in zip(tabs, ["review", "optimized", "lesson", "analysis"]):
        with tab:
            st.markdown(result[field])
    report = "\n\n".join("## " + field.title() + "\n\n" + result[field] for field in ["problem", "solution", "analysis", "review", "optimized", "lesson"])
    st.download_button("Download your review", report, file_name="interview-review.md", mime="text/markdown", key="download_review")

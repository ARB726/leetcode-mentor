from groq import Groq

def teach_pattern(client: Groq, problem: str, solution: str, optimized: str) -> str:
    print("\n🎓 Agent 4: Teaching you the pattern...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are a CS professor and coding interview coach.
                Given a LeetCode problem and its solutions, you will:
                1. Identify the core algorithmic pattern (sliding window, two pointers, DFS, DP, etc.)
                2. Explain WHY this pattern fits this problem
                3. List 3 similar LeetCode problems that use the same pattern
                4. Give a simple mental framework to recognize this pattern in future problems
                5. One key takeaway the student should remember
                Make it feel like a friendly tutoring session, not a lecture."""
            },
            {
                "role": "user",
                "content": f"""Problem:\n{problem}

My Solution:\n{solution}

Optimized Solution:\n{optimized}

What pattern should I learn from this?"""
            }
        ]
    )
    
    return response.choices[0].message.content

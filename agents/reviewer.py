from groq import Groq

def review_code(client: Groq, problem: str, solution: str, analysis: str) -> str:
    print("\n🔎 Agent 2: Reviewing your code...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are a senior software engineer doing a code review.
                Given a LeetCode problem, its analysis, and a solution, you will:
                1. Check for bugs or logical errors
                2. Evaluate time complexity (Big O)
                3. Evaluate space complexity (Big O)
                4. Check for edge cases that are not handled
                5. Comment on code readability and style
                Be specific and constructive."""
            },
            {
                "role": "user",
                "content": f"""Problem:\n{problem}
                
Analysis:\n{analysis}

My Solution:\n{solution}

Please review my solution."""
            }
        ]
    )
    
    return response.choices[0].message.content

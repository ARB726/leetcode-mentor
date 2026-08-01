from groq import Groq

def optimize_solution(client: Groq, problem: str, solution: str, review: str , language: str) -> str:
    print("\n⚡ Agent 3: Optimizing your solution...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert competitive programmer.
                Given a LeetCode problem, the original solution, and a code review, you will:
                1. Provide an optimized solution if one exists
                2. Explain why it is faster or more efficient
                3. Show the improved time and space complexity
                4. Walk through the optimized code step by step
                If the original solution is already optimal, say so and explain why.
                Always use {language} for any code examples."""
            },
            {
                "role": "user",
                "content": f"""Problem:\n{problem}

Original Solution:\n{solution}

Code Review:\n{review}

Please provide an optimized solution."""
            }
        ]
    )
    
    return response.choices[0].message.content

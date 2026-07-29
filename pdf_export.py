from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.colors import HexColor
import io

def export_to_pdf(problem_name: str, problem: str, solution: str, analysis: str, review: str, optimized: str, lesson: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=HexColor("#1a1a2e"),
        spaceAfter=6
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=HexColor("#4f46e5"),
        spaceBefore=16,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=16,
        spaceAfter=8
    )
    code_style = ParagraphStyle(
        "CodeStyle",
        parent=styles["Code"],
        fontSize=9,
        leading=14,
        backColor=HexColor("#f3f4f6"),
        borderPadding=8,
        spaceAfter=8
    )

    def clean(text):
        """Clean markdown for PDF"""
        import re
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
        text = text.replace('&', '&amp;').replace('<b>', '<b>').replace('</b>', '</b>')
        return text

    story = []

    # Title
    story.append(Paragraph(f"🧠 LeetCode Mentor Analysis", title_style))
    story.append(Paragraph(f"{problem_name.replace('-', ' ').title()}", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#4f46e5")))
    story.append(Spacer(1, 12))

    # Problem
    story.append(Paragraph("📋 Problem", heading_style))
    for line in problem.split("\n")[:20]:
        if line.strip():
            story.append(Paragraph(line.strip(), body_style))
    story.append(Spacer(1, 8))

    # My Solution
    story.append(Paragraph("💻 My Solution", heading_style))
    for line in solution.split("\n"):
        story.append(Paragraph(line if line.strip() else "&nbsp;", code_style))
    story.append(Spacer(1, 8))

    # Analysis
    story.append(Paragraph("🔍 Problem Analysis", heading_style))
    for line in analysis.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), body_style))
    story.append(Spacer(1, 8))

    # Code Review
    story.append(Paragraph("🔎 Code Review", heading_style))
    for line in review.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), body_style))
    story.append(Spacer(1, 8))

    # Optimized Solution
    story.append(Paragraph("⚡ Optimized Solution", heading_style))
    for line in optimized.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), body_style))
    story.append(Spacer(1, 8))

    # Lesson
    story.append(Paragraph("🎓 Lesson & Pattern", heading_style))
    for line in lesson.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
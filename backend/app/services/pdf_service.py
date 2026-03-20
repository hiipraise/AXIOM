from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import qrcode
import io
from PIL import Image as PILImage
from reportlab.platypus import Image as RLImage
from typing import Optional
from app.models.schemas import CVData


THEMES = {
    "minimal": {
        "bg": colors.white,
        "accent": colors.HexColor("#0F172A"),
        "text": colors.HexColor("#111111"),
        "secondary": colors.HexColor("#555555"),
        "line": colors.HexColor("#E2E8F0"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "classic": {
        "bg": colors.white,
        "accent": colors.HexColor("#1E3A5F"),
        "text": colors.HexColor("#1A1A1A"),
        "secondary": colors.HexColor("#4A4A4A"),
        "line": colors.HexColor("#CBD5E1"),
        "font_name": "Times-Roman",
        "font_bold": "Times-Bold",
    },
    "sharp": {
        "bg": colors.white,
        "accent": colors.HexColor("#DC2626"),
        "text": colors.HexColor("#0F0F0F"),
        "secondary": colors.HexColor("#3F3F3F"),
        "line": colors.HexColor("#E5E7EB"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "executive": {
        "bg": colors.HexColor("#FFFDFC"),
        "accent": colors.HexColor("#111827"),
        "text": colors.HexColor("#1F2937"),
        "secondary": colors.HexColor("#8B5E3C"),
        "line": colors.HexColor("#E7D7CB"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "nordic": {
        "bg": colors.HexColor("#F8FFFE"),
        "accent": colors.HexColor("#0F766E"),
        "text": colors.HexColor("#0F172A"),
        "secondary": colors.HexColor("#475569"),
        "line": colors.HexColor("#BEE3DB"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "terracotta": {
        "bg": colors.HexColor("#FFF8F4"),
        "accent": colors.HexColor("#C2410C"),
        "text": colors.HexColor("#431407"),
        "secondary": colors.HexColor("#7C5E52"),
        "line": colors.HexColor("#F1C9B6"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "forest": {
        "bg": colors.HexColor("#FAFFFB"),
        "accent": colors.HexColor("#166534"),
        "text": colors.HexColor("#1F2937"),
        "secondary": colors.HexColor("#4B5563"),
        "line": colors.HexColor("#CFE9D6"),
        "font_name": "Helvetica",
        "font_bold": "Helvetica-Bold",
    },
    "royal": {
        "bg": colors.HexColor("#FCFCFF"),
        "accent": colors.HexColor("#4338CA"),
        "text": colors.HexColor("#1E1B4B"),
        "secondary": colors.HexColor("#6B7280"),
        "line": colors.HexColor("#D9D6FE"),
        "font_name": "Times-Roman",
        "font_bold": "Times-Bold",
    },
}


def make_qr(url: str) -> Optional[RLImage]:
    try:
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return RLImage(buf, width=18 * mm, height=18 * mm)
    except Exception:
        return None


def generate_pdf(
    cv_data: CVData,
    owner_username: str,
    cv_title: str,
    theme_name: str = "minimal",
    page_count: int = 1,
    public_url: str = "",
) -> bytes:
    theme = THEMES.get(theme_name, THEMES["minimal"])
    buf = io.BytesIO()

    page_height = A4[1] * page_count if page_count > 1 else A4[1]

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=cv_title,
        author=owner_username,
    )

    fn = theme["font_name"]
    fb = theme["font_bold"]
    acc = theme["accent"]
    txt = theme["text"]
    sec = theme["secondary"]
    line_color = theme["line"]

    def style(name, **kw):
        return ParagraphStyle(name, **kw)

    name_style = style("Name", fontName=fb, fontSize=20, textColor=acc, spaceAfter=1 * mm)
    title_style = style("Title", fontName=fn, fontSize=11, textColor=sec, spaceAfter=3 * mm)
    contact_style = style("Contact", fontName=fn, fontSize=8.5, textColor=sec, spaceAfter=1 * mm)
    section_style = style("Section", fontName=fb, fontSize=10, textColor=acc, spaceBefore=4 * mm, spaceAfter=1 * mm)
    body_style = style("Body", fontName=fn, fontSize=9, textColor=txt, spaceAfter=1 * mm, leading=13)
    bullet_style = style("Bullet", fontName=fn, fontSize=9, textColor=txt, leftIndent=10, spaceAfter=0.5 * mm, leading=12)
    meta_style = style("Meta", fontName=fn, fontSize=8.5, textColor=sec, spaceAfter=0.5 * mm)
    skill_style = style("Skill", fontName=fn, fontSize=9, textColor=txt, spaceAfter=1 * mm, leading=13)

    story = []
    pi = cv_data.personal_info

    # Header
    story.append(Paragraph(pi.full_name or "Your Name", name_style))
    if pi.job_title:
        story.append(Paragraph(pi.job_title, title_style))

    # Contact line
    contacts = []
    if pi.email:
        contacts.append(pi.email)
    if pi.phone:
        contacts.append(pi.phone)
    if pi.location:
        contacts.append(pi.location)
    if pi.linkedin:
        contacts.append(pi.linkedin)
    if pi.github:
        contacts.append(pi.github)
    if pi.portfolio:
        contacts.append(pi.portfolio)
    if contacts:
        story.append(Paragraph("  |  ".join(contacts), contact_style))

    story.append(HRFlowable(width="100%", thickness=1, color=acc, spaceAfter=3 * mm, spaceBefore=2 * mm))

    # Summary
    if cv_data.summary:
        story.append(Paragraph("PROFILE", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        story.append(Paragraph(cv_data.summary, body_style))

    # Experience
    if cv_data.experience:
        story.append(Paragraph("EXPERIENCE", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for exp in cv_data.experience:
            date_str = f"{exp.start_date} – {'Present' if exp.current else exp.end_date}"
            story.append(Paragraph(f"<b>{exp.role}</b> — {exp.company}", body_style))
            story.append(Paragraph(date_str, meta_style))
            if exp.description:
                story.append(Paragraph(exp.description, body_style))
            for ach in exp.achievements:
                story.append(Paragraph(f"• {ach}", bullet_style))
            story.append(Spacer(1, 2 * mm))

    # Education
    if cv_data.education:
        story.append(Paragraph("EDUCATION", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for edu in cv_data.education:
            degree = f"{edu.degree}" + (f", {edu.field}" if edu.field else "")
            story.append(Paragraph(f"<b>{degree}</b> — {edu.institution}", body_style))
            date_str = f"{edu.start_date} – {edu.end_date}"
            if edu.grade:
                date_str += f"  |  {edu.grade}"
            story.append(Paragraph(date_str, meta_style))
            if edu.description:
                story.append(Paragraph(edu.description, body_style))
            story.append(Spacer(1, 2 * mm))

    # Skills
    if cv_data.skills:
        story.append(Paragraph("SKILLS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        story.append(Paragraph(", ".join(cv_data.skills), skill_style))

    # Certifications
    if cv_data.certifications:
        story.append(Paragraph("CERTIFICATIONS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for cert in cv_data.certifications:
            line = f"<b>{cert.name}</b> — {cert.issuer}"
            if cert.date:
                line += f"  ({cert.date})"
            story.append(Paragraph(line, body_style))
            if cert.url:
                story.append(Paragraph(f"Credential: {cert.url}", meta_style))
            if cert.credential_id:
                story.append(Paragraph(f"ID: {cert.credential_id}", meta_style))
            story.append(Spacer(1, 2 * mm))

    # Projects
    if cv_data.projects:
        story.append(Paragraph("PROJECTS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for proj in cv_data.projects:
            story.append(Paragraph(f"<b>{proj.name}</b>", body_style))
            if proj.description:
                story.append(Paragraph(proj.description, body_style))
            if proj.technologies:
                story.append(Paragraph(f"Technologies: {', '.join(proj.technologies)}", meta_style))
            if proj.url:
                story.append(Paragraph(f"URL: {proj.url}", meta_style))
            story.append(Spacer(1, 2 * mm))

    # Awards
    if cv_data.awards:
        story.append(Paragraph("AWARDS & RECOGNITION", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for award in cv_data.awards:
            story.append(Paragraph(f"<b>{award.title}</b> — {award.issuer}", body_style))
            if award.date:
                story.append(Paragraph(award.date, meta_style))
            if award.description:
                story.append(Paragraph(award.description, body_style))
            story.append(Spacer(1, 1 * mm))

    # Languages
    if cv_data.languages:
        story.append(Paragraph("LANGUAGES", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        lang_text = "  •  ".join(
            f"{l.language} ({l.proficiency})" if l.proficiency else l.language
            for l in cv_data.languages
        )
        story.append(Paragraph(lang_text, body_style))

    # Volunteer
    if cv_data.volunteer:
        story.append(Paragraph("VOLUNTEER & COMMUNITY", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=2 * mm))
        for vol in cv_data.volunteer:
            story.append(Paragraph(f"<b>{vol.role}</b> — {vol.organization}", body_style))
            date_str = f"{vol.start_date} – {vol.end_date}"
            story.append(Paragraph(date_str, meta_style))
            if vol.description:
                story.append(Paragraph(vol.description, body_style))
            story.append(Spacer(1, 2 * mm))

    # Footer with QR
    if public_url:
        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=line_color))
        qr_img = make_qr(public_url)
        if qr_img:
            footer_data = [
                [qr_img, Paragraph(f"Verify this CV at {public_url}", meta_style)]
            ]
            footer_table = Table(footer_data, colWidths=[22 * mm, None])
            footer_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(footer_table)

    doc.build(story)
    return buf.getvalue()

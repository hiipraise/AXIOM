"""
pdf_service.py — ATS-safe multi-template CV PDF generation (ReportLab canvas)

Templates:  standard | atlas | horizon | pulse | grid | minimal-pro
Themes:     minimal | classic | sharp | executive | nordic | terracotta | forest | royal

Architecture
------------
1. Primitives  – thin canvas wrappers (_draw, _hr, _rect, …)
2. Pen         – stateful y-cursor with page-break handling
3. Blocks      – shared section renderers (_exp, _edu, _skills, …)
4. Templates   – wire Pen(s) + blocks into a layout
5. Dispatcher  – generate_pdf() routes to the right template
"""
from __future__ import annotations

import io
from typing import Optional, Callable

import qrcode
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit as _rl_split
from reportlab.pdfgen import canvas as rl_canvas

from app.models.schemas import CVData


def _simpleSplit(text: str, font: str, size: float, max_w: float) -> list:
    """Consistent wrapper around ReportLab simpleSplit."""
    return _rl_split(text, font, size, max_w)

# ─── Page geometry ───────────────────────────────────────────────────────────
PW, PH = A4           # 595 × 842 pt
MX     = 18 * mm      # horizontal margin
MY     = 14 * mm      # vertical margin
CW     = PW - 2 * MX  # usable content width

# ─── Leading table  (font-size → line height in pt) ──────────────────────────
_LEAD: dict[float, float] = {
    7: 10, 7.5: 10.5, 8: 11, 8.5: 12, 9: 12.5, 9.5: 13.5,
    10: 14, 10.5: 15, 11: 15.5, 11.5: 16, 12: 17,
    14: 19, 16: 22, 18: 25, 20: 27, 22: 30, 24: 33, 28: 38, 30: 41,
}
def _lead(size: float) -> float:
    return _LEAD.get(size, size * 1.38)


# ─── Themes ──────────────────────────────────────────────────────────────────
def _hc(h: str) -> Color:
    return HexColor(h)

THEMES: dict[str, dict] = {
    "minimal":    dict(accent=_hc("#0F172A"), text=_hc("#111827"), sec=_hc("#64748B"), line=_hc("#E2E8F0"), fn="Helvetica",   fb="Helvetica-Bold"),
    "classic":    dict(accent=_hc("#1E3A5F"), text=_hc("#1A1A1A"), sec=_hc("#4A4A4A"), line=_hc("#CBD5E1"), fn="Times-Roman", fb="Times-Bold"),
    "sharp":      dict(accent=_hc("#DC2626"), text=_hc("#0F0F0F"), sec=_hc("#3F3F3F"), line=_hc("#E5E7EB"), fn="Helvetica",   fb="Helvetica-Bold"),
    "executive":  dict(accent=_hc("#111827"), text=_hc("#1F2937"), sec=_hc("#8B5E3C"), line=_hc("#E7D7CB"), fn="Helvetica",   fb="Helvetica-Bold"),
    "nordic":     dict(accent=_hc("#0F766E"), text=_hc("#0F172A"), sec=_hc("#475569"), line=_hc("#BEE3DB"), fn="Helvetica",   fb="Helvetica-Bold"),
    "terracotta": dict(accent=_hc("#C2410C"), text=_hc("#431407"), sec=_hc("#7C5E52"), line=_hc("#F1C9B6"), fn="Helvetica",   fb="Helvetica-Bold"),
    "forest":     dict(accent=_hc("#166534"), text=_hc("#1F2937"), sec=_hc("#4B5563"), line=_hc("#CFE9D6"), fn="Helvetica",   fb="Helvetica-Bold"),
    "royal":      dict(accent=_hc("#4338CA"), text=_hc("#1E1B4B"), sec=_hc("#6B7280"), line=_hc("#D9D6FE"), fn="Times-Roman", fb="Times-Bold"),
}


# ─── Primitives ──────────────────────────────────────────────────────────────

def _ok(v) -> bool:
    return bool(v and str(v).strip())

def _s(v) -> str:
    return str(v).strip() if v else ""

def _wrap(txt: str, font: str, size: float, max_w: float) -> list[str]:
    return _simpleSplit(_s(txt), font, size, max_w) if _ok(txt) else []

def _text_h(txt: str, font: str, size: float, max_w: float) -> float:
    lines = _wrap(txt, font, size, max_w)
    return len(lines) * _lead(size) if lines else 0

def _draw_text(c, txt: str, font: str, size: float, col: Color,
               x: float, y: float, max_w: float) -> float:
    """Draw wrapped text, return y BELOW last line."""
    lead = _lead(size)
    for line in _wrap(txt, font, size, max_w):
        c.setFont(font, size)
        c.setFillColor(col)
        c.drawString(x, y, line)
        y -= lead
    return y

def _draw_right(c, txt: str, font: str, size: float, col: Color, rx: float, y: float):
    if _ok(txt):
        c.setFont(font, size); c.setFillColor(col)
        c.drawRightString(rx, y, _s(txt))

def _hr(c, x: float, y: float, w: float, col: Color, thick: float = 0.5):
    c.setStrokeColor(col); c.setLineWidth(thick); c.line(x, y, x + w, y)

def _fill_rect(c, x: float, y_bottom: float, w: float, h: float,
               fill: Color, radius: float = 0):
    c.setFillColor(fill)
    c.roundRect(x, y_bottom, w, h, radius, fill=1, stroke=0)

def _stroke_rect(c, x: float, y_bottom: float, w: float, h: float,
                 col: Color, thick: float = 0.5, radius: float = 0):
    c.setStrokeColor(col); c.setLineWidth(thick)
    c.roundRect(x, y_bottom, w, h, radius, fill=0, stroke=1)

def _initials(name: str) -> str:
    parts = _s(name).split()
    return "".join(p[0] for p in parts[:2] if p).upper() or "?"

def _qr(url: str) -> Optional[ImageReader]:
    try:
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(url); qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO(); img.save(buf, "PNG"); buf.seek(0)
        return ImageReader(buf)
    except Exception:
        return None

def _contacts(pi) -> list[str]:
    return [v for v in [pi.email, pi.phone, pi.location,
                        pi.linkedin, pi.github, pi.portfolio, pi.website]
            if _ok(v)]


# ─── Pen ─────────────────────────────────────────────────────────────────────

class Pen:
    """
    Stateful drawing cursor.
    • y decreases downward (top of page = PH - MY).
    • check(h) triggers a page break before drawing h points of content.
    • on_new_page(c) is called after showPage so callers can redraw bg chrome.
    """
    __slots__ = ("c", "t", "x", "y", "w", "y_min", "on_new_page", "page")

    def __init__(self, c, t: dict,
                 x: float = MX, y: float | None = None, w: float = CW,
                 y_min: float = MY,
                 on_new_page: Callable | None = None):
        self.c           = c
        self.t           = t
        self.x           = x
        self.y           = (PH - MY) if y is None else y
        self.w           = w
        self.y_min       = y_min
        self.on_new_page = on_new_page
        self.page        = 0

    # ── cursor ───────────────────────────────────────────────────────────────
    def gap(self, pts: float):
        self.y -= abs(pts)

    def check(self, needed: float):
        if self.y - needed < self.y_min:
            self.c.showPage()
            self.page += 1
            self.y = PH - MY
            if self.on_new_page:
                self.on_new_page(self.c)

    # ── text ─────────────────────────────────────────────────────────────────
    def text(self, txt, size: float = 9.5, col: Color | None = None,
             indent: float = 0, font: str | None = None):
        if not _ok(txt): return
        f  = font or self.t["fn"]
        cl = col  if col is not None else self.t["text"]
        h  = _text_h(txt, f, size, self.w - indent)
        if h == 0: return
        self.check(h)
        self.y = _draw_text(self.c, txt, f, size, cl,
                            self.x + indent, self.y, self.w - indent)

    def bold(self, txt, size: float = 11, col: Color | None = None,
             indent: float = 0):
        self.text(txt, size, col if col is not None else self.t["text"],
                  indent, self.t["fb"])

    def meta(self, txt, size: float = 8.5, indent: float = 0):
        self.text(txt, size, self.t["sec"], indent)

    # ── decorations ──────────────────────────────────────────────────────────
    def hr(self, col: Color | None = None, thick: float = 0.5,
           offset: float = 0):
        _hr(self.c, self.x + offset, self.y,
            self.w - offset, col or self.t["line"], thick)

    def section_header(self, label: str, top_gap: float = 7):
        """Section label + rule."""
        self.check(22)
        self.gap(top_gap)
        self.c.setFont(self.t["fb"], 8)
        self.c.setFillColor(self.t["accent"])
        self.c.drawString(self.x, self.y, label.upper())
        self.y -= 4
        self.hr(self.t["line"], 0.4)
        self.gap(5)

    def title_meta_row(self, left: str, right: str = "",
                       l_size: float = 11, l_font: str | None = None):
        """
        Bold left text + right-aligned meta.
        Left text is constrained to w-60 so it never overlaps the date.
        """
        if not _ok(left): return
        lf       = l_font or self.t["fb"]
        date_w   = 58          # reserved pts for the right-aligned date
        left_w   = self.w - date_w
        h        = _text_h(left, lf, l_size, left_w)
        self.check(h + 2)
        baseline = self.y      # save baseline BEFORE drawing left text
        self.y   = _draw_text(self.c, left, lf, l_size, self.t["text"],
                               self.x, self.y, left_w)
        if _ok(right):
            _draw_right(self.c, right, self.t["fn"], 8.5, self.t["sec"],
                        self.x + self.w, baseline)


# ─── Shared section blocks ───────────────────────────────────────────────────

def _b_experience(pen: Pen, items: list):
    if not items: return
    pen.section_header("EXPERIENCE")
    for i, e in enumerate(items):
        left  = " — ".join(filter(_ok, [e.role, e.company]))
        dates = f"{e.start_date or ''}–{'Present' if e.current else (e.end_date or '')}"
        if dates.strip("–") == "": dates = ""
        pen.title_meta_row(left, dates)
        if _ok(e.description):
            pen.text(e.description, size=9.5, indent=2)
        for ach in (e.achievements or []):
            if _ok(ach):
                pen.text(f"• {_s(ach)}", size=9, indent=10)
        if i < len(items) - 1: pen.gap(5)


def _b_education(pen: Pen, items: list):
    if not items: return
    pen.section_header("EDUCATION")
    for i, e in enumerate(items):
        deg  = f"{_s(e.degree)}{', ' + _s(e.field) if _ok(e.field) else ''}"
        left = " — ".join(filter(_ok, [deg, e.institution]))
        dates = f"{e.start_date or ''}–{e.end_date or ''}"
        if dates.strip("–") == "": dates = ""
        pen.title_meta_row(left, dates)
        if _ok(e.grade):      pen.meta(e.grade, indent=2)
        if _ok(e.description): pen.meta(e.description, indent=2)
        if i < len(items) - 1: pen.gap(5)


def _b_skills(pen: Pen, items: list):
    if not items: return
    pen.section_header("SKILLS")
    pen.text(", ".join(_s(s) for s in items if _ok(s)), size=9.5)


def _b_certifications(pen: Pen, items: list):
    if not items: return
    pen.section_header("CERTIFICATIONS")
    for i, cert in enumerate(items):
        line = _s(cert.name)
        if _ok(cert.issuer): line += f" — {_s(cert.issuer)}"
        if _ok(cert.date):   line += f" ({_s(cert.date)})"
        pen.bold(line, size=10)
        if _ok(cert.url): pen.meta(f"Credential: {_s(cert.url)}", indent=2)
        if i < len(items) - 1: pen.gap(4)


def _b_projects(pen: Pen, items: list):
    if not items: return
    pen.section_header("PROJECTS")
    for i, p in enumerate(items):
        pen.bold(_s(p.name), size=10.5)
        if _ok(p.description):
            pen.text(p.description, size=9.5, indent=2)
        techs = [_s(t) for t in (p.technologies or []) if _ok(t)]
        if techs: pen.meta(", ".join(techs), indent=2)
        if _ok(p.url): pen.meta(f"URL: {_s(p.url)}", indent=2)
        if i < len(items) - 1: pen.gap(5)


def _b_awards(pen: Pen, items: list):
    if not items: return
    pen.section_header("AWARDS & RECOGNITION")
    for i, a in enumerate(items):
        line = _s(a.title)
        if _ok(a.issuer): line += f" — {_s(a.issuer)}"
        pen.bold(line, size=10.5)
        if _ok(a.date): pen.meta(_s(a.date), indent=2)
        if _ok(a.description): pen.text(a.description, size=9.5, indent=2)
        if i < len(items) - 1: pen.gap(4)


def _b_languages(pen: Pen, items: list):
    if not items: return
    pen.section_header("LANGUAGES")
    parts = [f"{_s(l.language)}" + (f" ({_s(l.proficiency)})" if _ok(l.proficiency) else "")
             for l in items if _ok(l.language)]
    pen.text("  •  ".join(parts), size=9.5)


def _b_volunteer(pen: Pen, items: list):
    if not items: return
    pen.section_header("VOLUNTEER & COMMUNITY")
    for i, v in enumerate(items):
        left  = " — ".join(filter(_ok, [v.role, v.organization]))
        dates = f"{v.start_date or ''}–{v.end_date or ''}"
        if dates.strip("–") == "": dates = ""
        pen.title_meta_row(left, dates)
        if _ok(v.description): pen.text(v.description, size=9.5, indent=2)
        if i < len(items) - 1: pen.gap(5)


# ─── Helpers for filtered lists ──────────────────────────────────────────────

def _exp_items(cv):   return [e for e in cv.experience     if _ok(e.role) or _ok(e.company)]
def _edu_items(cv):   return [e for e in cv.education      if _ok(e.institution) or _ok(e.degree)]
def _cert_items(cv):  return [c for c in cv.certifications if _ok(c.name)]
def _proj_items(cv):  return [p for p in cv.projects       if _ok(p.name)]
def _award_items(cv): return [a for a in cv.awards         if _ok(a.title)]
def _lang_items(cv):  return [l for l in cv.languages      if _ok(l.language)]
def _vol_items(cv):   return [v for v in cv.volunteer      if _ok(v.role) or _ok(v.organization)]
def _skill_items(cv): return [s for s in cv.skills         if _ok(s)]


# ═══════════════════════════════════════════════════════════════════════════════
# Template: STANDARD
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_standard(c, cv, t: dict, public_url: str):
    pen = Pen(c, t)
    pi  = cv.personal_info

    # Header
    if _ok(pi.full_name):
        pen.bold(_s(pi.full_name), size=22, col=t["accent"])
    if _ok(pi.job_title):
        pen.text(_s(pi.job_title), size=11, col=t["sec"])
        pen.gap(2)
    line = "  |  ".join(_contacts(pi))
    if line:
        pen.text(line, size=8.5, col=t["sec"])
    pen.gap(4)
    pen.hr(t["accent"], thick=1.5)
    pen.gap(6)

    # Body
    if _ok(cv.summary):
        pen.section_header("PROFILE")
        pen.text(cv.summary, size=9.5)

    _b_experience(pen, _exp_items(cv))
    _b_education(pen, _edu_items(cv))
    _b_skills(pen, _skill_items(cv))
    _b_certifications(pen, _cert_items(cv))
    _b_projects(pen, _proj_items(cv))
    _b_awards(pen, _award_items(cv))
    _b_languages(pen, _lang_items(cv))
    _b_volunteer(pen, _vol_items(cv))

    # QR footer
    if public_url:
        pen.gap(8); pen.hr(t["line"]); pen.gap(4)
        qr_img = _qr(public_url)
        if qr_img:
            qr_sz = 18 * mm
            c.drawImage(qr_img, MX, pen.y - qr_sz, qr_sz, qr_sz, mask="auto")
            c.setFont(t["fn"], 8); c.setFillColor(t["sec"])
            c.drawString(MX + qr_sz + 5, pen.y - 10,
                         f"Verify at {public_url}")


# ═══════════════════════════════════════════════════════════════════════════════
# Template: ATLAS  (coloured sidebar left | main content right)
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_atlas(c, cv, t: dict, public_url: str):
    SIDE_W  = PW * 0.33           # sidebar width from page left edge
    PAD     = 13                  # inner padding inside sidebar
    MAIN_X  = SIDE_W + 10         # main column x
    MAIN_W  = PW - SIDE_W - MX - 10

    # Sidebar text theme (light on dark)
    st = dict(
        accent=white, text=white, sec=_hc("#BBBBBB"),
        line=_hc("#FFFFFF40"), fn=t["fn"], fb=t["fb"],
    )

    def draw_sidebar_bg(canvas):
        """Full-page sidebar background — called on every page."""
        _fill_rect(canvas, 0, 0, SIDE_W, PH, t["accent"])

    # Draw bg on page 1
    draw_sidebar_bg(c)

    pi = cv.personal_info

    # ── Sidebar content ───────────────────────────────────────────────────────
    sp = Pen(c, st,
             x=MX * 0.6 + PAD,
             y=PH - MY - 4,
             w=SIDE_W - MX * 0.6 - PAD * 2,
             on_new_page=draw_sidebar_bg)

    # Avatar circle
    av_r  = 22
    av_cx = SIDE_W / 2
    av_cy = sp.y - av_r - 4
    _fill_rect(c, av_cx - av_r, av_cy - av_r,
               av_r * 2, av_r * 2, _hc("#FFFFFF30"), radius=av_r)
    c.setFont(t["fb"], 16); c.setFillColor(white)
    c.drawCentredString(av_cx, av_cy - 6, _initials(_s(pi.full_name)))
    sp.y = av_cy - av_r - 10

    # Name / title centred
    if _ok(pi.full_name):
        c.setFont(t["fb"], 13); c.setFillColor(white)
        c.drawCentredString(av_cx, sp.y, _s(pi.full_name))
        sp.y -= _lead(13)
    if _ok(pi.job_title):
        c.setFont(t["fn"], 9); c.setFillColor(st["sec"])
        c.drawCentredString(av_cx, sp.y, _s(pi.job_title))
        sp.y -= _lead(9)
    sp.gap(4)
    _hr(c, MX * 0.4, sp.y, SIDE_W - MX * 0.8, _hc("#FFFFFF30"), 0.5)
    sp.gap(8)

    # Contact
    cts = _contacts(pi)
    if cts:
        sp.c.setFont(st["fb"], 7.5); sp.c.setFillColor(st["sec"])
        sp.c.drawString(sp.x, sp.y, "CONTACT"); sp.y -= 10
        for ct in cts:
            sp.text(_s(ct), size=9, col=white)

    # Skills
    sk = _skill_items(cv)
    if sk:
        sp.gap(8)
        sp.c.setFont(st["fb"], 7.5); sp.c.setFillColor(st["sec"])
        sp.c.drawString(sp.x, sp.y, "SKILLS"); sp.y -= 10
        sp.text(", ".join(sk), size=9, col=white)

    # Languages
    ll = _lang_items(cv)
    if ll:
        sp.gap(8)
        sp.c.setFont(st["fb"], 7.5); sp.c.setFillColor(st["sec"])
        sp.c.drawString(sp.x, sp.y, "LANGUAGES"); sp.y -= 10
        for l in ll:
            line = _s(l.language) + (f" ({_s(l.proficiency)})" if _ok(l.proficiency) else "")
            sp.text(line, size=9, col=white)

    # Summary
    if _ok(cv.summary):
        sp.gap(8)
        sp.c.setFont(st["fb"], 7.5); sp.c.setFillColor(st["sec"])
        sp.c.drawString(sp.x, sp.y, "PROFILE"); sp.y -= 10
        sp.text(cv.summary, size=9, col=white)

    # ── Main column ───────────────────────────────────────────────────────────
    # Main pen shares the SAME on_new_page so sidebar bg is redrawn on its breaks too
    mp = Pen(c, t,
             x=MAIN_X, y=PH - MY - 4,
             w=MAIN_W,
             on_new_page=draw_sidebar_bg)

    _b_experience(mp, _exp_items(cv))
    _b_education(mp, _edu_items(cv))
    _b_projects(mp, _proj_items(cv))
    _b_certifications(mp, _cert_items(cv))
    _b_awards(mp, _award_items(cv))
    _b_volunteer(mp, _vol_items(cv))


# ═══════════════════════════════════════════════════════════════════════════════
# Template: HORIZON  (full-width accent header | two-column body)
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_horizon(c, cv, t: dict, public_url: str):
    pi = cv.personal_info

    # ── Full-width header ─────────────────────────────────────────────────────
    HDR_H = 76
    _fill_rect(c, 0, PH - HDR_H, PW, HDR_H, t["accent"])

    hy = PH - MY - 4
    if _ok(pi.full_name):
        c.setFont(t["fb"], 22); c.setFillColor(white)
        c.drawString(MX, hy, _s(pi.full_name)); hy -= 27
    if _ok(pi.job_title):
        c.setFont(t["fn"], 11); c.setFillColor(_hc("#DDDDDD"))
        c.drawString(MX, hy, _s(pi.job_title)); hy -= 15
    cts = "  |  ".join(_contacts(pi))
    if cts:
        c.setFont(t["fn"], 8.5); c.setFillColor(_hc("#AAAAAA"))
        c.drawString(MX, hy, cts)

    # ── Optional summary strip ────────────────────────────────────────────────
    start_y = PH - HDR_H - 10
    if _ok(cv.summary):
        sh = _text_h(cv.summary, t["fn"], 10, CW, ) + 16
        _hr(c, MX, start_y, CW, t["line"], 0.5)
        start_y -= 8
        start_y = _draw_text(c, cv.summary, t["fn"], 10, t["text"],
                             MX, start_y, CW)
        start_y -= 8
        _hr(c, MX, start_y, CW, t["line"], 0.5)
        start_y -= 8

    # ── Two-column body ───────────────────────────────────────────────────────
    LEFT_W  = CW * 0.61
    RIGHT_W = CW * 0.39 - 10
    RIGHT_X = MX + LEFT_W + 10
    DIVIDER_X = MX + LEFT_W + 4

    _hr(c, DIVIDER_X, start_y, 0, t["line"], 0.4)  # placeholder — draw divider after

    lp = Pen(c, t, x=MX,      y=start_y, w=LEFT_W  - 8)
    rp = Pen(c, t, x=RIGHT_X, y=start_y, w=RIGHT_W - 4)

    _b_experience(lp, _exp_items(cv))
    _b_education(lp, _edu_items(cv))
    _b_volunteer(lp, _vol_items(cv))

    _b_skills(rp, _skill_items(cv))
    _b_certifications(rp, _cert_items(cv))
    _b_projects(rp, _proj_items(cv))
    _b_awards(rp, _award_items(cv))
    _b_languages(rp, _lang_items(cv))

    # Vertical divider line between columns
    divider_top    = start_y
    divider_bottom = min(lp.y, rp.y) - 4
    _hr(c, DIVIDER_X, divider_bottom, 0, t["line"])  # no-op width=0
    c.setStrokeColor(t["line"]); c.setLineWidth(0.4)
    c.line(DIVIDER_X, divider_top, DIVIDER_X, divider_bottom)


# ═══════════════════════════════════════════════════════════════════════════════
# Template: PULSE  (single column with timeline dots + connectors)
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_pulse(c, cv, t: dict, public_url: str):
    DOT_CX  = MX + 5
    TEXT_X  = MX + 18
    TEXT_W  = CW - 18
    pi      = cv.personal_info

    # ── Header ────────────────────────────────────────────────────────────────
    pen = Pen(c, t, x=TEXT_X, w=TEXT_W)

    if _ok(pi.full_name):
        pen.bold(_s(pi.full_name), size=22, col=t["accent"])
    if _ok(pi.job_title):
        pen.text(_s(pi.job_title), size=11, col=t["sec"]); pen.gap(2)
    cts = "  |  ".join(_contacts(pi))
    if cts:
        pen.text(cts, size=8.5, col=t["sec"])
    pen.gap(4)
    _hr(c, TEXT_X, pen.y, TEXT_W, t["accent"], 1.5); pen.gap(8)

    # Summary with left accent bar
    if _ok(cv.summary):
        sh = _text_h(cv.summary, t["fn"], 10, TEXT_W)
        pen.check(sh + 10)
        _fill_rect(c, MX, pen.y - sh - 4, 3, sh + 8, t["accent"])
        pen.text(cv.summary, size=10); pen.gap(6)

    # ── Timeline section helper ───────────────────────────────────────────────
    def tl_section(label: str):
        pen.check(24); pen.gap(8)
        c.setFont(t["fb"], 8.5); c.setFillColor(t["accent"])
        c.drawString(TEXT_X, pen.y, label.upper()); pen.y -= 4
        _hr(c, TEXT_X, pen.y, TEXT_W, t["line"]); pen.gap(8)

    def dot_and_connector(dot_y: float, prev_dot_y: float | None):
        # Connector from previous dot
        if prev_dot_y is not None:
            c.setStrokeColor(t["line"]); c.setLineWidth(1.5)
            c.line(DOT_CX, prev_dot_y - 7, DOT_CX, dot_y + 7)
        # Dot
        c.setFillColor(t["accent"])
        c.circle(DOT_CX, dot_y, 4, fill=1, stroke=0)
        # Ring
        c.setStrokeColor(t["accent"]); c.setLineWidth(0.5)
        c.setFillColor(white)
        c.circle(DOT_CX, dot_y, 6.5, fill=0, stroke=1)

    # ── Experience ────────────────────────────────────────────────────────────
    exp = _exp_items(cv)
    if exp:
        tl_section("EXPERIENCE")
        prev_y = None
        for i, e in enumerate(exp):
            left  = " — ".join(filter(_ok, [e.role, e.company]))
            dates = f"{e.start_date or ''}–{'Present' if e.current else (e.end_date or '')}"
            if dates.strip("–") == "": dates = ""
            pen.check(28)
            dot_and_connector(pen.y, prev_y)
            prev_y = pen.y
            pen.title_meta_row(left, dates)
            if _ok(e.description):
                pen.text(e.description, size=9.5, indent=2)
            for ach in (e.achievements or []):
                if _ok(ach): pen.text(f"• {_s(ach)}", size=9, indent=10)
            if i < len(exp) - 1: pen.gap(6)

    # ── Education ─────────────────────────────────────────────────────────────
    edu = _edu_items(cv)
    if edu:
        tl_section("EDUCATION")
        prev_y = None
        for i, e in enumerate(edu):
            deg   = f"{_s(e.degree)}{', ' + _s(e.field) if _ok(e.field) else ''}"
            left  = " — ".join(filter(_ok, [deg, e.institution]))
            dates = f"{e.start_date or ''}–{e.end_date or ''}"
            if dates.strip("–") == "": dates = ""
            pen.check(24)
            dot_and_connector(pen.y, prev_y)
            prev_y = pen.y
            pen.title_meta_row(left, dates)
            if _ok(e.grade): pen.meta(e.grade, indent=2)
            if i < len(edu) - 1: pen.gap(6)

    # ── Projects ──────────────────────────────────────────────────────────────
    proj = _proj_items(cv)
    if proj:
        tl_section("PROJECTS")
        prev_y = None
        for i, p in enumerate(proj):
            pen.check(24)
            dot_and_connector(pen.y, prev_y)
            prev_y = pen.y
            pen.bold(_s(p.name), size=11)
            if _ok(p.description):
                pen.text(p.description, size=9.5, indent=2)
            techs = [_s(tx) for tx in (p.technologies or []) if _ok(tx)]
            if techs: pen.meta(", ".join(techs), indent=2)
            if i < len(proj) - 1: pen.gap(6)

    # ── Bottom strip: skills | langs | certs | awards ─────────────────────────
    sk  = _skill_items(cv)
    ll  = _lang_items(cv)
    ce  = _cert_items(cv)
    aw  = _award_items(cv)
    vol = _vol_items(cv)

    if vol:
        tl_section("VOLUNTEER")
        prev_y = None
        for i, v in enumerate(vol):
            left  = " — ".join(filter(_ok, [v.role, v.organization]))
            dates = f"{v.start_date or ''}–{v.end_date or ''}"
            if dates.strip("–") == "": dates = ""
            pen.check(24)
            dot_and_connector(pen.y, prev_y)
            prev_y = pen.y
            pen.title_meta_row(left, dates)
            if _ok(v.description): pen.text(v.description, size=9.5, indent=2)
            if i < len(vol) - 1: pen.gap(6)

    if sk or ll or ce or aw:
        pen.gap(10); pen.hr(t["line"]); pen.gap(8)
        LEFT_W2 = TEXT_W * 0.58
        RIGHT_X2 = TEXT_X + LEFT_W2 + 10

        yL = pen.y
        if sk:
            c.setFont(t["fb"], 8); c.setFillColor(t["accent"])
            c.drawString(TEXT_X, yL, "SKILLS"); yL -= 10
            yL = _draw_text(c, ", ".join(sk), t["fn"], 9.5, t["text"],
                            TEXT_X, yL, LEFT_W2)
        yR = pen.y
        for label, items2, fmt in [
            ("LANGUAGES",      ll, lambda l: _s(l.language) + (f" · {_s(l.proficiency)}" if _ok(l.proficiency) else "")),
            ("CERTIFICATIONS", ce, lambda c2: _s(c2.name)),
            ("AWARDS",         aw, lambda a: _s(a.title)),
        ]:
            if items2:
                c.setFont(t["fb"], 8); c.setFillColor(t["accent"])
                c.drawString(RIGHT_X2, yR, label); yR -= 10
                for it in items2:
                    yR = _draw_text(c, fmt(it), t["fn"], 9.5, t["text"],
                                    RIGHT_X2, yR, TEXT_W - LEFT_W2 - 10)
                yR -= 4


# ═══════════════════════════════════════════════════════════════════════════════
# Template: GRID  (header card + summary card + two-column bordered boxes)
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_grid(c, cv, t: dict, public_url: str):
    PAD     = 10
    R       = 4
    LEFT_W  = CW * 0.60
    RIGHT_W = CW - LEFT_W - 8
    RIGHT_X = MX + LEFT_W + 8
    pi      = cv.personal_info
    y       = PH - MY

    # ── Header card ───────────────────────────────────────────────────────────
    cts = _contacts(pi)
    hdr_h = PAD + _lead(22) + _lead(11) + len(cts) * _lead(9) + PAD
    _stroke_rect(c, MX, y - hdr_h, CW, hdr_h, t["line"], radius=R)
    _fill_rect(c, MX, y - hdr_h, 4, hdr_h, t["accent"], radius=R)

    hy = y - PAD - 2
    if _ok(pi.full_name):
        c.setFont(t["fb"], 20); c.setFillColor(t["accent"])
        c.drawString(MX + PAD + 6, hy, _s(pi.full_name)); hy -= _lead(20)
    if _ok(pi.job_title):
        c.setFont(t["fn"], 11); c.setFillColor(t["sec"])
        c.drawString(MX + PAD + 6, hy, _s(pi.job_title)); hy -= _lead(11)
    for ct in cts:
        c.setFont(t["fn"], 8.5); c.setFillColor(t["sec"])
        c.drawString(MX + PAD + 6, hy, ct); hy -= _lead(9)
    y -= hdr_h + 8

    # ── Summary card ──────────────────────────────────────────────────────────
    if _ok(cv.summary):
        sh = _text_h(cv.summary, t["fn"], 10, CW - PAD * 2) + PAD * 2
        _stroke_rect(c, MX, y - sh, CW, sh, t["line"], radius=R)
        _draw_text(c, cv.summary, t["fn"], 10, t["text"],
                   MX + PAD, y - PAD, CW - PAD * 2)
        y -= sh + 8

    # ── Two-column section cards ───────────────────────────────────────────────
    # Each section is drawn into a card box.
    # We draw left column top-to-bottom, then right column top-to-bottom.
    # Within each column, each section is boxed individually.

    def column_sections(start_x, col_w, sections):
        """Draw a list of (block_fn, items) as stacked bordered cards."""
        cy = y
        for block_fn, items in sections:
            if not items: continue
            # Measure content height by using a scratch Pen and counting y drop
            # We use a fixed-size estimate: 20pt per header + 14pt per item
            item_count = len(items)
            est_h = 20 + sum(
                16 + (
                    _text_h(getattr(i, 'description', '') or '', t["fn"], 9.5,
                            col_w - PAD * 2)
                )
                for i in items
            ) + item_count * 6
            est_h = max(est_h, 24) + PAD * 2

            # Page break if needed
            if cy - est_h < MY:
                c.showPage(); cy = PH - MY

            # Draw the card border first (we'll overdraw with content)
            box_y = cy - est_h
            _stroke_rect(c, start_x, box_y, col_w, est_h, t["line"], radius=R)

            # Draw content inside
            pen = Pen(c, t,
                      x=start_x + PAD, y=cy - PAD,
                      w=col_w - PAD * 2,
                      y_min=box_y + PAD)
            block_fn(pen, items)

            # Actual content bottom
            actual_h = (cy - PAD) - pen.y + PAD
            actual_h = max(actual_h, 16) + PAD

            # Redraw box with correct height
            _fill_rect(c, start_x, cy - actual_h - 2, col_w, actual_h + 2,
                       white)  # erase over-estimated box
            _stroke_rect(c, start_x, cy - actual_h - 2, col_w,
                         actual_h + 2, t["line"], radius=R)

            # Redraw content (second pass — now box is correct size)
            pen2 = Pen(c, t,
                       x=start_x + PAD, y=cy - PAD,
                       w=col_w - PAD * 2)
            block_fn(pen2, items)

            cy -= actual_h + 10

    column_sections(MX, LEFT_W, [
        (_b_experience, _exp_items(cv)),
        (_b_education,  _edu_items(cv)),
        (_b_volunteer,  _vol_items(cv)),
    ])
    column_sections(RIGHT_X, RIGHT_W, [
        (_b_skills,        _skill_items(cv)),
        (_b_projects,      _proj_items(cv)),
        (_b_certifications,_cert_items(cv)),
        (_b_languages,     _lang_items(cv)),
        (_b_awards,        _award_items(cv)),
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# Template: MINIMAL-PRO  (label column left | content column right, accent rule)
# ═══════════════════════════════════════════════════════════════════════════════

def _tpl_minimal_pro(c, cv, t: dict, public_url: str):
    LABEL_W   = 82
    GAP       = 18
    BORDER_W  = 2
    CONTENT_X = MX + LABEL_W + GAP
    CONTENT_W = CW - LABEL_W - GAP
    pi        = cv.personal_info

    y = PH - MY

    # ── Big header ────────────────────────────────────────────────────────────
    if _ok(pi.full_name):
        c.setFont(t["fb"], 28); c.setFillColor(t["text"])
        c.drawString(MX, y, _s(pi.full_name)); y -= _lead(28)
    if _ok(pi.job_title):
        c.setFont(t["fn"], 12); c.setFillColor(t["sec"])
        c.drawString(MX, y, _s(pi.job_title)); y -= _lead(12)
    cts = "  |  ".join(_contacts(pi))
    if cts:
        c.setFont(t["fn"], 9); c.setFillColor(t["sec"])
        c.drawString(MX, y, cts); y -= _lead(9)
    y -= 6
    _hr(c, MX, y, CW, t["text"], 2.5); y -= 14

    # ── Row renderer ─────────────────────────────────────────────────────────
    def row(label: str, block_fn, items):
        nonlocal y
        if not items: return

        # -- measure by doing a dry run into a fresh canvas
        buf_m  = io.BytesIO()
        c_m    = rl_canvas.Canvas(buf_m, pagesize=A4)
        dry    = Pen(c_m, t, x=CONTENT_X, y=500, w=CONTENT_W)
        block_fn(dry, items)
        c_m.save()
        h = max(500 - dry.y + 8, 18)

        # page break
        if y - h - 14 < MY:
            c.showPage(); y = PH - MY

        row_top    = y
        row_bottom = y - h - 14

        # Accent vertical rule beside content
        _fill_rect(c, CONTENT_X - BORDER_W - 5, row_bottom,
                   BORDER_W, row_top - row_bottom, t["accent"])

        # Label
        c.setFont(t["fb"], 7.5); c.setFillColor(t["sec"])
        c.drawString(MX, row_top, label.upper())

        # Content
        content_pen = Pen(c, t, x=CONTENT_X, y=row_top, w=CONTENT_W)
        block_fn(content_pen, items)

        y = row_bottom
        # Row separator
        _hr(c, MX, y + 6, CW, t["line"], 0.4)

    row("Profile",        lambda p, _: p.text(cv.summary, size=10.5) if _ok(cv.summary) else None,
        [cv.summary] if _ok(cv.summary) else [])
    row("Experience",     _b_experience,    _exp_items(cv))
    row("Education",      _b_education,     _edu_items(cv))
    row("Skills",         _b_skills,        _skill_items(cv))
    row("Projects",       _b_projects,      _proj_items(cv))
    row("Certifications", _b_certifications,_cert_items(cv))
    row("Languages",      _b_languages,     _lang_items(cv))
    row("Awards",         _b_awards,        _award_items(cv))
    row("Volunteer",      _b_volunteer,     _vol_items(cv))


# ─── Dispatcher ──────────────────────────────────────────────────────────────

_RENDERERS = {
    "standard":    _tpl_standard,
    "atlas":       _tpl_atlas,
    "horizon":     _tpl_horizon,
    "pulse":       _tpl_pulse,
    "grid":        _tpl_grid,
    "minimal-pro": _tpl_minimal_pro,
}


def generate_pdf(
    cv_data:        CVData,
    owner_username: str,
    cv_title:       str,
    theme_name:     str = "minimal",
    page_count:     int = 1,
    public_url:     str = "",
    template:       str = "standard",
) -> bytes:
    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=A4)
    c.setTitle(cv_title)
    c.setAuthor(owner_username)

    t        = THEMES.get(theme_name, THEMES["minimal"])
    renderer = _RENDERERS.get(template, _tpl_standard)
    renderer(c, cv_data, t, public_url)

    c.save()
    return buf.getvalue()
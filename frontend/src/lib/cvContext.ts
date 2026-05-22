export interface CareerLevel {
  value: string;
  label: string;
  hint: string;
}

export interface Industry {
  value: string;
  label: string;
  hint: string;
}

export const CAREER_LEVELS: CareerLevel[] = [
  { value: "", label: "General", hint: "No level-specific tailoring" },
  {
    value: "student",
    label: "Student / Undergraduate",
    hint: "Internships, entry-level, graduate schemes",
  },
  {
    value: "graduate",
    label: "Graduate / 0-2 Years",
    hint: "First role after degree, junior positions",
  },
  {
    value: "mid",
    label: "Mid-Level / 2-7 Years",
    hint: "Individual contributor, first management",
  },
  {
    value: "senior",
    label: "Senior / 7+ Years",
    hint: "Director, head-of, principal, senior specialist",
  },
  {
    value: "career_switch",
    label: "Career Switcher",
    hint: "Moving to a new industry or function",
  },
  {
    value: "executive",
    label: "Executive / C-Suite",
    hint: "VP, C-suite, board-level roles",
  },
];

export const INDUSTRIES: Industry[] = [
  { value: "", label: "General", hint: "No industry-specific tailoring" },
  {
    value: "tech",
    label: "Tech & Software",
    hint: "Engineering, data, product, DevOps",
  },
  {
    value: "business",
    label: "Business, Finance & Strategy",
    hint: "Finance, consulting, operations, strategy",
  },
  {
    value: "marketing",
    label: "Marketing & Growth",
    hint: "Digital, brand, content, performance",
  },
  {
    value: "health",
    label: "Health Sciences",
    hint: "Clinical, research, public health, pharma",
  },
  {
    value: "creative",
    label: "Creative & Media",
    hint: "Design, content, film, journalism, UX",
  },
  {
    value: "engineering",
    label: "Engineering & Manufacturing",
    hint: "Civil, mechanical, electrical, industrial",
  },
  {
    value: "education",
    label: "Education & Training",
    hint: "Teaching, L&D, curriculum, EdTech",
  },
  {
    value: "legal",
    label: "Legal & Compliance",
    hint: "Solicitor, barrister, paralegal, compliance",
  },
  {
    value: "general",
    label: "Other",
    hint: "General optimisation without sector-specific rules",
  },
];

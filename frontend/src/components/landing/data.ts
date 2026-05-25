import {
  Wand2,
  Upload,
  MessageSquare,
  FileText,
  QrCode,
  Clock,
  Shield,
  Globe,
  Users,
  Zap,
  Search,
} from "lucide-react";
import type { ComponentType } from "react";

export interface FeatureItem {
  icon: ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  desc: string;
}

export interface FeatureGroup {
  group: string;
  items: FeatureItem[];
}

export const FEATURES: FeatureGroup[] = [
  {
    group: "Building",
    items: [
      {
        icon: Wand2,
        label: "AI Interview Mode",
        desc: "Answer questions naturally — AI structures your CV from your answers.",
      },
      {
        icon: Upload,
        label: "PDF Import",
        desc: "Upload an existing CV and we extract and convert it to editable JSON.",
      },
      {
        icon: MessageSquare,
        label: "AI Assist Panel",
        desc: "Chat, apply edits, or align your CV to a specific job description.",
      },
    ],
  },
  {
    group: "Review & Output",
    items: [
      {
        icon: Zap,
        label: "CV Review",
        desc: "Scored across 6 dimensions — impact, ATS fit, structure, language, and more. Brutal, specific, actionable.",
      },
      {
        icon: Search,
        label: "Keyword Gap",
        desc: "Paste a job description and see exactly which ATS keywords are missing and where to add them.",
      },
      {
        icon: FileText,
        label: "6 CV Templates",
        desc: "Standard, Atlas, Horizon, Pulse, Grid, Minimal Pro — all ATS-safe with clean typography.",
      },
    ],
  },
  {
    group: "Output & Policy",
    items: [
      {
        icon: QrCode,
        label: "QR Verification",
        desc: "Public CVs include a QR code linking to the verified web version.",
      },
      {
        icon: Clock,
        label: "Version History",
        desc: "Every save creates a restore point — roll back any time.",
      },
      {
        icon: Shield,
        label: "Zero-Cliché Policy",
        desc: 'AI is blocked from writing "passionate", "synergy", or 20+ other banned phrases.',
      },
    ],
  },
  {
    group: "Account",
    items: [
      {
        icon: Globe,
        label: "Public Profile",
        desc: "Share a public profile page listing all your public CVs.",
      },
      {
        icon: Users,
        label: "No Email Required",
        desc: "Register with just a username and password. Email is optional.",
      },
    ],
  },
];

export interface Step {
  n: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    n: "01",
    title: "Create or import",
    body: "Start from scratch, paste a job description, or upload your existing PDF CV. We extract and convert it.",
  },
  {
    n: "02",
    title: "Build with AI",
    body: "Use the AI interview mode to flesh out your experience with concrete, specific language.",
  },
  {
    n: "03",
    title: "Align to the role",
    body: "Paste any job description. AI reorders and rewrites to match — without fabricating a single fact.",
  },
  {
    n: "04",
    title: "Download or share",
    body: "Export a pixel-perfect PDF or flip your CV public and share a verified link with a QR code.",
  },
];

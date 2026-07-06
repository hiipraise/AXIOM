import { useEffect, useRef, useCallback } from "react";
import { driver } from "driver.js";
import type { Driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TourOptions {
  /** When true, starts the tour after a short delay to let the editor mount */
  enabled?: boolean;
  /** Called when the tour finishes or is skipped */
  onFinish?: () => void;
}

interface StepDef {
  selector: string;
  title: string;
  desc: string[]; // [desktop, mobile]
  side: "left" | "right" | "bottom" | "top";
  align: "start" | "center" | "end";
}

/**
 * Find the first VISIBLE element matching a selector, scanning ALL matches.
 * This is critical because many features have BOTH a desktop sidebar button
 * (visible at ≥768px) and a mobile toolbar icon (visible below 768px).
 * The mobile button appears first in DOM order, so querySelector() alone
 * would return a hidden element on desktop.
 */
function findVisible(selector: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(selector);
  for (const el of els) {
    if (el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0) {
      return el;
    }
  }
  return null;
}

/**
 * Build tour steps dynamically, skipping any whose target element is not visible.
 * This handles desktop vs mobile layout gracefully:
 * - Desktop sidebar buttons have `hidden md:flex` → visible at ≥768px
 * - Mobile toolbar buttons have `md:hidden` → visible below 768px
 * - Auto-Save indicator has `hidden md:flex` → only on desktop, skipped on mobile
 */
function buildSteps(isMobile: boolean) {
  const sidebarS = isMobile ? "bottom" as const : "right" as const;
  const sidebarBottomS = isMobile ? "bottom" as const : "left" as const;
  const brief = (d: string, m: string) => isMobile ? m : d;

  const allSteps: StepDef[] = [
    { selector: '[data-tour="sidebar"]',     title: "CV Sections",          desc: [
      "Navigate between CV sections — Personal Info, Skills, Experience, Education, and more. Drag the grip handles to reorder sections to your preference.",
      "Tap the section name to switch between Personal Info, Skills, Experience, and more.",
    ], side: sidebarS, align: "start" },
    { selector: '[data-tour="save"]',         title: "Auto-Save & Undo",    desc: [
      "Your CV auto-saves 2 seconds after you stop editing. Use Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z) to step through changes. The indicator shows Saved, Saving, or Unsaved.",
      "Your CV auto-saves as you edit — no manual save button needed.",
    ], side: "bottom", align: "start" },
    { selector: '[data-tour="title"]',        title: "CV Title & Layout",   desc: [
      "Name your CV, then choose from 6 templates, 13 themes, and 1-3 page lengths. The live file-name preview shows how your CV will appear when exported.",
      "Name your CV above. Use the Settings (gear) button to choose a template, theme, and page count.",
    ], side: "bottom", align: "center" },
    { selector: '[data-tour="export"]',       title: "Visibility & Export", desc: [
      "Toggle your CV between Public (shareable link) and Private. Export as PDF, Word (.docx), or Plain Text (.txt). PDF/A option is available for compliance.",
      "Toggle Public/Private visibility. Export your CV as PDF, Word, or plain text from the download menu.",
    ], side: "bottom", align: "end" },
    { selector: '[data-tour="ai-assist"]',    title: "AI Assist",           desc: [
      "Let AXIOM help you write, improve, and tailor your CV. Generate professional summaries, optimise bullet points, rewrite sections in different tones, and match your CV to specific job descriptions.",
      "Use AI to generate summaries, rewrite sections, and tailor your CV to job descriptions.",
    ], side: sidebarBottomS, align: "center" },
    { selector: '[data-tour="skill-gap"]',    title: "Skill Gap Analysis",  desc: [
      "Compare your skills against real job market data. Discover which skills are in demand for your target role, identify missing keywords, and get personalised course recommendations to close the gap.",
      "Compare your skills against market data, find what's in demand, and get course recommendations.",
    ], side: sidebarBottomS, align: "center" },
    { selector: '[data-tour="ats"]',          title: "ATS Compatibility",   desc: [
      "Check how well your CV will score against Applicant Tracking Systems. Review keyword matching, formatting issues, and section parsing — then fix problems before applying.",
      "See how your CV scores with automated systems. Check keyword matching and formatting before applying.",
    ], side: sidebarBottomS, align: "center" },
    { selector: '[data-tour="review-tools"]', title: "Review & History",    desc: [
      "Comments: leave or receive feedback on specific sections. Suggestions: get AI-powered recommendations to improve each section. History: view past versions, compare changes, and restore any saved version.",
      "Review feedback, get AI suggestions for improvements, and restore older versions from history.",
    ], side: sidebarBottomS, align: "center" },
  ];

  return allSteps
    .map((s) => ({ ...s, element: findVisible(s.selector) }))
    .filter((s) => s.element !== null)
    .map((s) => ({
      element: s.element!,
      popover: {
        title: s.title,
        description: brief(s.desc[0], s.desc[1]),
        side: s.side,
        align: s.align,
      },
    }));
}

export function useCVEditorTour({ enabled = false, onFinish }: TourOptions) {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) return; // already running

    const isMobile = window.innerWidth < 768;
    const steps = buildSteps(isMobile);

    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps,
      onDestroyed: () => {
        onFinish?.();
        // Remove the tour param from the URL so it doesn't re-trigger on refresh
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("tour");
          window.history.replaceState({}, "", url.toString());
        }
      },
    });

    driverObj.drive();
    driverRef.current = driverObj;
  }, [onFinish]);

  useEffect(() => {
    if (!enabled) return;

    // Small delay to let the editor mount and target elements render
    const timer = setTimeout(startTour, 600);

    return () => {
      clearTimeout(timer);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [enabled, startTour]);
}

import { useState, useCallback } from "react";
import { cvApi, publicApi, api, exportApi } from "../api";
import { renderCVtoHTML } from "../utils/renderCVtoHTML";
import type { CVData } from "../types";
import toast from "react-hot-toast";

interface CVWithData {
  data: CVData;
}

/**
 * Generates PDFs by:
 * 1. Rendering CVRenderer into a hidden off-screen div (real browser layout)
 * 2. Capturing the innerHTML as a self-contained HTML document
 * 3. Sending it to the backend /api/export/html-pdf endpoint
 * 4. Backend runs Playwright (headless Chromium) → returns a real PDF
 *
 * Result: pixel-perfect match with the on-screen template, correct fonts,
 * correct spacing, works on all devices including iOS/Android.
 */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function generateAndDownload(
  cvDataObj: CVWithData,
  theme: string,
  template: string,
  filename: string,
) {
  // Render the React component to HTML in the current browser
  const { data: cvData } = cvDataObj;
  const html = await renderCVtoHTML(cvData, theme, template, 1.16);

  // Send to backend for Playwright PDF generation
  const blob = await api
    .post("/export/html-pdf", { html }, { responseType: "blob" })
    .then((r) => r.data as Blob);

  download(blob, filename);
}

export function usePrintCV() {
  const [isPrinting, setIsPrinting] = useState(false);
  const printJob = null;
  const clearJob = useCallback(() => {}, []);

  const printCV = useCallback(async (cvId: string) => {
    setIsPrinting(true);
    const tid = toast.loading("Rendering PDF…");
    try {
      const cv = await cvApi.get(cvId);
      const name = cv.data.personal_info.full_name || cv.owner_username;
      const html = await renderCVtoHTML(
        cv.data,
        cv.theme || "minimal",
        cv.template || "standard",
        1.16,
      );
      const blob = await api
        .post("/export/html-pdf", { html }, { responseType: "blob" })
        .then((r) => r.data as Blob);
      download(blob, `${name}-${cv.title}.pdf`);
      toast.success("PDF downloaded", { id: tid });
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF", { id: tid });
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printPublicCV = useCallback(async (username: string, slug: string) => {
    setIsPrinting(true);
    const tid = toast.loading("Rendering PDF…");
    try {
      const cv = await publicApi.getCV(username, slug);
      const name = cv.data.personal_info.full_name || username;
      const html = await renderCVtoHTML(
        cv.data,
        cv.theme || "minimal",
        cv.template || "standard",
        1.16,
      );
      const blob = await api
        .post("/export/html-pdf", { html }, { responseType: "blob" })
        .then((r) => r.data as Blob);
      download(blob, `${name}-${slug}.pdf`);
      toast.success("PDF downloaded", { id: tid });
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF", { id: tid });
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const exportCV = useCallback(async (cvId: string, format: "pdf" | "docx" | "txt") => {
    setIsPrinting(true);
    const tid = toast.loading(`Rendering ${format.toUpperCase()}…`);
    try {
      await cvApi.update(cvId, {
        data: (await cvApi.get(cvId)).data,
      });
      let blob: Blob;
      let filename: string;
      const cv = await cvApi.get(cvId);
      const name = cv.data.personal_info.full_name || cv.owner_username;

      if (format === "docx") {
        blob = await exportApi.downloadDOCX(cvId);
        filename = `${name}-${cv.title}.docx`;
      } else if (format === "txt") {
        blob = await exportApi.downloadTXT(cvId);
        filename = `${name}-${cv.title}.txt`;
        download(blob, filename);
        toast.success(`${format.toUpperCase()} downloaded`, { id: tid });
        return;
      } else {
        blob = await exportApi.downloadPDF(cvId);
        filename = `${name}-${cv.title}.pdf`;
      }

      download(blob, filename);
      toast.success(`${format.toUpperCase()} downloaded`, { id: tid });
    } catch (e) {
      console.error(e);
      toast.error(`Could not generate ${format.toUpperCase()}`, { id: tid });
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const exportPublicCV = useCallback(async (username: string, slug: string, format: "pdf" | "docx" | "txt") => {
    setIsPrinting(true);
    const tid = toast.loading(`Rendering ${format.toUpperCase()}…`);
    try {
      let blob: Blob;
      let filename: string;
      const cv = await publicApi.getCV(username, slug);
      const name = cv.data.personal_info.full_name || username;

      if (format === "docx") {
        blob = await exportApi.downloadPublicDOCX(username, slug);
        filename = `${name}-${slug}.docx`;
      } else if (format === "txt") {
        blob = await exportApi.downloadPublicTXT(username, slug);
        filename = `${name}-${slug}.txt`;
        download(blob, filename);
        toast.success(`${format.toUpperCase()} downloaded`, { id: tid });
        return;
      } else {
        blob = await exportApi.downloadPublicPDF(username, slug);
        filename = `${name}-${slug}.pdf`;
      }

      download(blob, filename);
      toast.success(`${format.toUpperCase()} downloaded`, { id: tid });
    } catch (e) {
      console.error(e);
      toast.error(`Could not generate ${format.toUpperCase()}`, { id: tid });
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return { printCV, printPublicCV, exportCV, exportPublicCV, printJob, clearJob, isPrinting };
}

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/lib/supabase";

export interface ZipDoc {
  file_path: string;
  file_name: string | null;
  folder?: string;
}

export async function downloadDocsAsZip(docs: ZipDoc[], zipName: string) {
  if (docs.length === 0) throw new Error("No documents to download");
  const zip = new JSZip();
  await Promise.all(
    docs.map(async (d) => {
      try {
        const { data, error } = await supabase.storage
          .from("client-documents")
          .download(d.file_path);
        if (error || !data) return;
        const folder = d.folder ? `${sanitize(d.folder)}/` : "";
        zip.file(`${folder}${sanitize(d.file_name ?? d.file_path.split("/").pop() ?? "file")}`, data);
      } catch {
        /* ignore individual failures */
      }
    }),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${sanitize(zipName)}_${date}.zip`);
}

export async function getSignedUrl(filePath: string) {
  const { data } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function downloadSingle(filePath: string, fileName: string | null) {
  const { data, error } = await supabase.storage
    .from("client-documents")
    .download(filePath);
  if (error || !data) throw new Error(error?.message ?? "Download failed");
  saveAs(data, fileName ?? filePath.split("/").pop() ?? "file");
}

export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, filename);
}

function sanitize(s: string) {
  return s.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
}

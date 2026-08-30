"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  deleteInvoiceAttachment,
  listInvoiceAttachments,
  uploadInvoiceAttachment,
  type InvoiceAttachment,
} from "@/lib/api/invoices";
import { cn } from "@/lib/utils/cn";

const ACCEPT = ".pdf,.png,.jpg,.jpeg";
const MAX_BYTES = 5_000_000;

/**
 * Files carried alongside an invoice.
 *
 * <p>An attachment has to belong to something, so nothing can be uploaded until the invoice
 * exists. Rather than silently dropping files or holding them in memory to replay after the first
 * save — which loses them on a refresh — the dropzone says plainly that the draft has to be saved
 * first, and becomes live the moment it is.
 */
export function InvoiceAttachments({ invoiceId }: { invoiceId: string | null }) {
  const [files, setFiles] = useState<InvoiceAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    listInvoiceAttachments(invoiceId)
      .then((list) => {
        if (!cancelled) setFiles(list);
      })
      .catch(() => {
        // The list is secondary; a failure here should not block the editor.
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  async function accept(selected: FileList | null) {
    if (!invoiceId || !selected || selected.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(selected)) {
        // Checked here as well as server-side, so an obviously-too-large file fails instantly
        // instead of after the upload.
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name} is larger than 5 MB`);
        }
        const saved = await uploadInvoiceAttachment(invoiceId, file);
        setFiles((current) => [saved, ...current]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not attach that file",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(file: InvoiceAttachment) {
    if (!invoiceId) return;
    try {
      await deleteInvoiceAttachment(invoiceId, file.id);
      setFiles((current) => current.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove that file");
    }
  }

  const disabled = !invoiceId || busy;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (invoiceId) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-slate-50/60",
          !invoiceId && "opacity-70",
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => void accept(event.target.files)}
        />

        <p className="mt-3 text-xs text-muted">or drag them here</p>
        <p className="text-xs text-muted">.pdf, .png, .jpg, .jpeg (max. 5 MB)</p>

        {!invoiceId ? (
          <p className="mt-3 text-xs text-amber-700">
            Save the draft first — a document has to be attached to an invoice that exists.
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              <a href={file.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                {file.fileName}
              </a>
              <button
                type="button"
                aria-label={`Remove ${file.fileName}`}
                onClick={() => void remove(file)}
                className="text-primary/70 hover:text-primary"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";

export function ShareActions({
  shareUrl,
  downloadUrl,
  showView = true,
}: {
  shareUrl: string;
  downloadUrl: string;
  showView?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copyLink} className="btn-secondary">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy link"}
      </button>

      <a href={downloadUrl} download className="btn-primary">
        <Download size={14} /> Download collage
      </a>

      {showView ? (
        <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-secondary">
          View public page <ExternalLink size={13} />
        </a>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useWallet } from "@/hooks/useWallet";

interface ReportModalProps {
  tokenId: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REPORT_TYPES = [
  { value: "scam_link", label: "Scam/phishing link" },
  { value: "drainer", label: "Wallet drainer" },
  { value: "fake_social", label: "Fake social accounts" },
  { value: "impersonation", label: "Impersonation" },
  { value: "rug_pull", label: "Rug pull" },
  { value: "bundle_detected", label: "Bundle detected" },
  { value: "other", label: "Other" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function ReportModal({ tokenId, open, onClose, onSubmitted }: ReportModalProps) {
  const { wallet } = useAuthStore();
  const { isConnected, signIn } = useWallet();
  const { pushToast } = useUiStore();
  const [reportType, setReportType] = useState("scam_link");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!isConnected) {
      const ok = await signIn();
      if (!ok) return;
    }
    if (description.trim().length < 10) {
      pushToast({ kind: "warning", message: "Description must be at least 10 characters" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/report/${tokenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          severity,
          description: description.trim(),
          evidence_url: evidenceUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Submit failed");
      }
      pushToast({ kind: "success", message: "Report submitted — thank you" });
      onSubmitted?.();
      onClose();
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Submit failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Flag className="h-5 w-5 text-danger" />
            Report Token
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Type</label>
            <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    severity === s.value
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-border-glow"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Description (required, min 10 chars)
            </label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? When? Any details that help the team investigate."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Evidence URL (optional)
            </label>
            <input
              className="input"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

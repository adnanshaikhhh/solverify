"use client";

import { useState } from "react";
import { Save, X, Edit2, Image as ImageIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useUiStore } from "@/store/uiStore";

interface MetadataEditorProps {
  tokenId: string;
  initial: {
    name: string | null;
    symbol: string | null;
    description: string | null;
    website_url: string | null;
    twitter_url: string | null;
    telegram_url: string | null;
    discord_url: string | null;
    github_url: string | null;
    whitepaper_url: string | null;
    logo_url: string | null;
    banner_url: string | null;
  };
  canEdit: boolean;
  onSaved?: () => void;
}

type Fields = MetadataEditorProps["initial"];

export function MetadataEditor({ tokenId, initial, canEdit, onSaved }: MetadataEditorProps) {
  const { pushToast } = useUiStore();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Fields>(initial);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  if (!canEdit) {
    return (
      <GlassCard>
        <p className="text-text-secondary">
          You must be the verified owner to edit this token&apos;s metadata.
        </p>
      </GlassCard>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/metadata/${tokenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Save failed");
      }
      pushToast({ kind: "success", message: "Metadata updated" });
      setEditing(false);
      onSaved?.();
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File, kind: "logo" | "banner") => {
    const form = new FormData();
    form.append("file", file);
    const setter = kind === "logo" ? setLogoUploading : setBannerUploading;
    setter(true);
    try {
      const res = await fetch(`/api/metadata/${tokenId}/${kind}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setFields((f) => ({ ...f, [`${kind}_url`]: data.url } as Fields));
      pushToast({ kind: "success", message: `${kind === "logo" ? "Logo" : "Banner"} uploaded` });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setter(false);
    }
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Token Metadata</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-active bg-bg-elevated px-3 py-1.5 text-sm font-medium hover:border-border-glow"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFields(initial);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle px-3 py-1.5 text-sm hover:bg-bg-elevated"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name" value={fields.name} onChange={(v) => setFields({ ...fields, name: v })} disabled={!editing} />
        <Field label="Symbol" value={fields.symbol} onChange={(v) => setFields({ ...fields, symbol: v })} disabled={!editing} />
        <Field
          label="Description"
          value={fields.description}
          onChange={(v) => setFields({ ...fields, description: v })}
          disabled={!editing}
          multiline
          className="md:col-span-2"
        />
        <Field label="Website" value={fields.website_url} onChange={(v) => setFields({ ...fields, website_url: v })} disabled={!editing} placeholder="https://" />
        <Field label="Twitter" value={fields.twitter_url} onChange={(v) => setFields({ ...fields, twitter_url: v })} disabled={!editing} placeholder="https://" />
        <Field label="Telegram" value={fields.telegram_url} onChange={(v) => setFields({ ...fields, telegram_url: v })} disabled={!editing} placeholder="https://" />
        <Field label="Discord" value={fields.discord_url} onChange={(v) => setFields({ ...fields, discord_url: v })} disabled={!editing} placeholder="https://" />
        <Field label="GitHub" value={fields.github_url} onChange={(v) => setFields({ ...fields, github_url: v })} disabled={!editing} placeholder="https://" />
        <Field label="Whitepaper" value={fields.whitepaper_url} onChange={(v) => setFields({ ...fields, whitepaper_url: v })} disabled={!editing} placeholder="https://" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ImageUploader
          label="Logo"
          url={fields.logo_url}
          uploading={logoUploading}
          onUpload={(f) => upload(f, "logo")}
        />
        <ImageUploader
          label="Banner"
          url={fields.banner_url}
          uploading={bannerUploading}
          onUpload={(f) => upload(f, "banner")}
        />
      </div>
    </GlassCard>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  multiline,
  placeholder,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      {multiline ? (
        <textarea
          className="input min-h-[100px] resize-y"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          className="input"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ImageUploader({
  label,
  url,
  uploading,
  onUpload,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-text-muted" />
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border-active bg-bg-elevated px-3 py-2 text-sm font-medium hover:border-border-glow">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
            disabled={uploading}
          />
          {uploading ? "Uploading..." : "Choose file"}
        </label>
      </div>
    </div>
  );
}

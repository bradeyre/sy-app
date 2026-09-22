"use client";

import { useRef, useState } from "react";
import { compressImageTo1MB, isHeicFile } from "@/lib/imageCompress";
import {
  HANDBAG_MISS_CONDITIONS,
  HANDBAG_MISS_COPY,
  HANDBAG_MISS_PHOTO_SHOTS,
  HANDBAG_MISS_REQUIRED_SHOTS,
  hasRequiredHandbagPhotos,
} from "@/lib/luxuryHandbagMiss";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-base font-medium text-fg">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-line bg-card px-3 py-2 text-base text-fg placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
}

async function uploadPhoto(file) {
  if (isHeicFile(file)) {
    throw new Error(HANDBAG_MISS_COPY.heicWhatsAppFallback);
  }
  const compressed = await compressImageTo1MB(file);
  if (!compressed.ok) {
    if (compressed.reason === "heic") throw new Error(HANDBAG_MISS_COPY.heicWhatsAppFallback);
    throw new Error("Could not prepare that photo. Try a JPG or PNG under 1MB.");
  }
  const ready = compressed.file;
  const ext = (ready.name.split(".").pop() || "jpg").toLowerCase();
  const sign = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileExt: ext }),
  }).then((r) => r.json());
  if (sign.error || !sign.uploadUrl) throw new Error(sign.error || "Could not prepare upload");
  const put = await fetch(sign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": ready.type || "image/jpeg" },
    body: ready,
  });
  if (!put.ok) throw new Error("Upload failed");
  return { path: sign.path, fileName: ready.name };
}

function PhotoGuideSheet({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="photo-sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-sheet-title"
      onClick={onClose}
    >
      <div className="photo-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <h2 id="photo-sheet-title" className="text-base font-semibold text-fg">
          {HANDBAG_MISS_COPY.fieldPhotos}
        </h2>
        <p className="mt-1 text-sm text-muted">Four shots, then extras if you have them.</p>
        <ol className="mt-3 space-y-2">
          {HANDBAG_MISS_PHOTO_SHOTS.map((shot, i) => (
            <li key={shot.key} className="flex items-start gap-3 text-base text-fg">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                {i + 1}
              </span>
              <span>
                {shot.label}
                {!shot.required && <span className="ml-1 text-sm text-muted">(optional)</span>}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white"
        >
          {HANDBAG_MISS_COPY.addPhotos}
        </button>
      </div>
    </div>
  );
}

export default function HandbagMissStep({
  draft,
  onChange,
  onBack,
  onContinue,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sawGuide, setSawGuide] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const pendingKey = useRef(HANDBAG_MISS_REQUIRED_SHOTS[0].key);
  const fileRef = useRef(null);

  const photos = draft.handbagPhotos || [];
  const byKey = Object.fromEntries(photos.map((p) => [p.key, p]));

  function update(patch) {
    onChange({ ...draft, ...patch });
  }

  function openAddPhotos() {
    if (!sawGuide) {
      setSheetOpen(true);
      return;
    }
    const next =
      HANDBAG_MISS_PHOTO_SHOTS.find((s) => !byKey[s.key]?.path) || HANDBAG_MISS_PHOTO_SHOTS[0];
    pendingKey.current = next.key;
    fileRef.current?.click();
  }

  function closeSheet() {
    setSheetOpen(false);
    setSawGuide(true);
    const next =
      HANDBAG_MISS_PHOTO_SHOTS.find((s) => !byKey[s.key]?.path) || HANDBAG_MISS_REQUIRED_SHOTS[0];
    pendingKey.current = next.key;
    setTimeout(() => fileRef.current?.click(), 50);
  }

  async function onFile(file) {
    if (!file) return;
    const key = pendingKey.current;
    setBusyKey(key);
    setError(null);
    try {
      const uploaded = await uploadPhoto(file);
      const shot = HANDBAG_MISS_PHOTO_SHOTS.find((s) => s.key === key);
      const next = photos.filter((p) => p.key !== key).concat({
        key,
        label: shot?.label || key,
        path: uploaded.path,
        fileName: uploaded.fileName,
      });
      update({ handbagPhotos: next });
    } catch (err) {
      setError(err.message || "Could not upload that photo.");
    } finally {
      setBusyKey(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const ready =
    draft.brand?.trim() &&
    draft.model?.trim() &&
    draft.colourOrMaterial?.trim() &&
    draft.condition &&
    hasRequiredHandbagPhotos(photos);

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="mb-1 text-base font-medium text-brand hover:underline">
        ← Back
      </button>
      <p className="text-base font-medium text-fg">{HANDBAG_MISS_COPY.missEntryCta}</p>
      <p className="text-sm text-muted">{HANDBAG_MISS_COPY.promise48h}</p>

      <Field label={HANDBAG_MISS_COPY.fieldBrand} required>
        <input
          className={inputClass()}
          value={draft.brand}
          onChange={(e) => update({ brand: e.target.value })}
          autoComplete="off"
        />
      </Field>
      <Field label={HANDBAG_MISS_COPY.fieldModel} required>
        <input
          className={inputClass()}
          value={draft.model}
          onChange={(e) => update({ model: e.target.value })}
          autoComplete="off"
        />
      </Field>
      <Field label={HANDBAG_MISS_COPY.fieldColour} required>
        <input
          className={inputClass()}
          value={draft.colourOrMaterial}
          onChange={(e) => update({ colourOrMaterial: e.target.value })}
        />
      </Field>
      <Field label={HANDBAG_MISS_COPY.fieldCondition} required>
        <select
          className={inputClass()}
          value={draft.condition}
          onChange={(e) => {
            const value = e.target.value;
            const row = HANDBAG_MISS_CONDITIONS.find((c) => c.value === value);
            update({ condition: value, conditionLabel: row?.label || value });
          }}
        >
          <option value="">Select condition</option>
          {HANDBAG_MISS_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={HANDBAG_MISS_COPY.fieldSerial}>
        <textarea
          className={inputClass()}
          rows={2}
          value={draft.serialNotes}
          onChange={(e) => update({ serialNotes: e.target.value })}
        />
      </Field>

      <div>
        <p className="mb-1 text-base font-medium text-fg">
          {HANDBAG_MISS_COPY.fieldPhotos} <span className="text-danger">*</span>
        </p>
        <button
          type="button"
          onClick={openAddPhotos}
          className="w-full rounded-xl border border-brand bg-brand/5 px-4 py-3.5 text-left font-semibold text-brand"
        >
          {HANDBAG_MISS_COPY.addPhotos}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <ul className="mt-3 space-y-2">
          {HANDBAG_MISS_PHOTO_SHOTS.map((shot, i) => {
            const row = byKey[shot.key];
            return (
              <li key={shot.key} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
                <span className="min-w-0 text-sm text-fg">
                  <span className="mr-2 font-semibold text-brand">{i + 1}</span>
                  {shot.label}
                  {!shot.required && <span className="text-muted"> (optional)</span>}
                  {busyKey === shot.key && <span className="block text-muted">Uploading…</span>}
                  {row?.path && <span className="block truncate text-positive">{row.fileName || "Uploaded"}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    pendingKey.current = shot.key;
                    if (!sawGuide) {
                      setSheetOpen(true);
                      return;
                    }
                    fileRef.current?.click();
                  }}
                  className="shrink-0 text-sm font-medium text-brand hover:underline"
                >
                  {row?.path ? "Replace" : "Upload"}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          className="mt-2 text-sm font-medium text-brand hover:underline"
        >
          {HANDBAG_MISS_COPY.photoTips}
        </button>
        {tipsOpen && (
          <ol className="mt-2 space-y-1 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-muted">
            {HANDBAG_MISS_REQUIRED_SHOTS.map((shot, i) => (
              <li key={shot.key}>
                {i + 1}. {shot.label}
              </li>
            ))}
          </ol>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <div className="rounded-xl border border-line bg-canvas px-4 py-3">
        <p className="text-sm leading-relaxed text-muted">{HANDBAG_MISS_COPY.counterfeitDisclaimer}</p>
        <a
          href={HANDBAG_MISS_COPY.authHelperUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
        >
          {HANDBAG_MISS_COPY.authHelperCta}
        </a>
        <p className="mt-1 text-sm text-muted">{HANDBAG_MISS_COPY.authHelperHint}</p>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={onContinue}
        className="w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
      >
        Continue
      </button>
      <PhotoGuideSheet open={sheetOpen} onClose={closeSheet} />
    </div>
  );
}

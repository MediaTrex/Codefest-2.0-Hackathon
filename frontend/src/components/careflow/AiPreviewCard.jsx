export default function AiPreviewCard({ preview, analyzing }) {
  if (!preview && !analyzing) return null

  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-brand-soft)] p-4 mt-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[12px] font-semibold text-[var(--cf-brand)] uppercase tracking-wide">
          AI reading the case
        </span>
        {analyzing && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--cf-brand)] animate-pulse" />
        )}
      </div>
      {analyzing && !preview ? (
        <p className="text-[13px] text-[var(--cf-ink-faint)]">Drafting a summary…</p>
      ) : (
        <>
          <p className="text-[13.5px] text-[var(--cf-ink)]">
            {preview?.narrative || '—'}
          </p>
          {preview?.confidence != null && (
            <span
              className="inline-block mt-2 text-[12px] px-2 py-0.5 rounded-full bg-[var(--cf-surface)] border border-[var(--cf-border)]"
              style={{ fontFamily: 'var(--cf-font-mono)' }}
            >
              Confidence: {preview.confidence}% · intake completeness
            </span>
          )}
        </>
      )}
    </div>
  )
}

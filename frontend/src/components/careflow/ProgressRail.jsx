const STEPS = ['Photo', 'Basics', 'Symptoms', 'Review']

export default function ProgressRail({ currentStep }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold ${
              i <= currentStep
                ? 'bg-[var(--cf-brand)] text-white'
                : 'bg-[var(--cf-surface-sunken)] text-[var(--cf-ink-faint)]'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-[12.5px] ${
              i <= currentStep ? 'text-[var(--cf-ink)]' : 'text-[var(--cf-ink-faint)]'
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-[var(--cf-border)] hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  )
}

/** Derive rail step from form completeness (status indicator, not a wizard gate). */
export function deriveIntakeStep(form) {
  const hasPhoto = Boolean(form.photoUrl) || form.photoSkipped
  const hasBasics = Boolean(form.patientName?.trim() && form.age)
  const hasSymptoms = Boolean(form.description?.trim())
  const hasUrgency = Boolean(form.urgency)
  if (hasPhoto && hasBasics && hasSymptoms && hasUrgency) return 3
  if (hasPhoto && hasBasics && hasSymptoms) return 2
  if (hasPhoto && hasBasics) return 1
  if (hasPhoto) return 0
  // Still show step 0 as current while photo empty — allow skip via photoSkipped
  if (hasBasics || hasSymptoms) return hasBasics ? 1 : 0
  return 0
}

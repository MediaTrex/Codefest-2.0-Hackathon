const PRESET_CONDITIONS = [
  { id: 'fever', label: 'Fever', snippet: 'Patient presents with fever.' },
  {
    id: 'cough',
    label: 'Cough',
    snippet: 'Patient presents with cough and respiratory symptoms.',
  },
  { id: 'chest_pain', label: 'Chest pain', snippet: 'Patient presents with chest pain.' },
  {
    id: 'injury',
    label: 'Injury / Trauma',
    snippet: 'Patient presents with injury/trauma.',
  },
  {
    id: 'abdominal',
    label: 'Abdominal pain',
    snippet: 'Patient presents with abdominal pain.',
  },
  { id: 'headache', label: 'Headache', snippet: 'Patient presents with headache.' },
  {
    id: 'allergic',
    label: 'Allergic reaction',
    snippet: 'Patient presents with suspected allergic reaction.',
  },
  {
    id: 'followup',
    label: 'Follow-up visit',
    snippet: 'Follow-up visit for ongoing treatment.',
  },
]

export default function PresetConditionChips({ description, onDescriptionChange }) {
  const activeIds = PRESET_CONDITIONS.filter((p) =>
    (description || '').includes(p.snippet)
  ).map((p) => p.id)

  function toggle(preset) {
    const current = description || ''
    if (current.includes(preset.snippet)) {
      const next = current
        .replace(preset.snippet, '')
        .replace(/\n{2,}/g, '\n')
        .trim()
      onDescriptionChange(next)
    } else {
      const next = current.trim()
        ? `${current.trim()} ${preset.snippet}`
        : preset.snippet
      onDescriptionChange(next)
    }
  }

  return (
    <div>
      <p className="text-[12px] text-[var(--cf-ink-faint)] mb-2">Quick-select</p>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_CONDITIONS.map((p) => {
          const active = activeIds.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              className={`text-[12.5px] px-3 py-1.5 rounded-md font-medium border-none cursor-pointer transition-colors ${
                active
                  ? 'bg-[var(--cf-brand)] text-white'
                  : 'bg-[var(--cf-surface-sunken)] text-[var(--cf-ink-soft)] hover:bg-[var(--cf-brand-soft)]'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { Camera, ImagePlus, Smartphone, X } from 'lucide-react'

const SOURCE_LABEL = {
  door_camera: 'Door camera',
  patient_app: 'Patient app',
  upload: 'Upload',
  mock: 'Demo',
}

/**
 * Patient photo placeholder — door kiosk camera, patient-app sync, or file upload.
 * Emits { photoUrl, photoSource } where photoUrl is a data URL or static path.
 */
export default function PatientPhotoCapture({
  photoUrl,
  photoSource,
  onChange,
  patientName = '',
}) {
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const compress = async (dataUrl, max = 480) => {
    try {
      const img = new Image()
      img.src = dataUrl
      await img.decode()
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      return canvas.toDataURL('image/jpeg', 0.82)
    } catch {
      return dataUrl
    }
  }

  const handleFile = async (file, source) => {
    if (!file) return
    setBusy(true)
    try {
      const raw = await readAsDataUrl(file)
      const photoUrlNext = await compress(raw)
      onChange({ photoUrl: photoUrlNext, photoSource: source })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-[12px] text-[var(--cf-ink-faint)] mb-2">Patient photo</p>
      <div className="flex items-start gap-4">
        <div className="relative w-[96px] h-[96px] rounded-xl border border-dashed border-[var(--cf-border)] bg-[var(--cf-surface-sunken)] overflow-hidden shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={patientName || 'Patient'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[var(--cf-ink-faint)] px-2 text-center">
              <Camera size={22} strokeWidth={1.5} />
              <span className="text-[10px] leading-tight">No photo yet</span>
            </div>
          )}
          {photoUrl && (
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange({ photoUrl: null, photoSource: null })}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--cf-ink)]/70 text-white grid place-items-center border-none cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <p className="text-[12px] text-[var(--cf-ink-soft)] leading-snug">
            Capture at the door camera, pull from the patient app, or upload a file.
          </p>
          {photoSource && (
            <span className="text-[11px] text-[var(--cf-ink-faint)]">
              Source: {SOURCE_LABEL[photoSource] || photoSource}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--cf-brand)] text-white border-none cursor-pointer disabled:opacity-50"
            >
              <Camera size={13} /> Door camera
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--cf-border)] bg-white text-[var(--cf-ink-soft)] cursor-pointer disabled:opacity-50"
            >
              <ImagePlus size={13} /> Upload
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onChange({
                  photoUrl: '/patients/placeholder.svg',
                  photoSource: 'patient_app',
                })
              }
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--cf-border)] bg-white text-[var(--cf-ink-soft)] cursor-pointer disabled:opacity-50"
              title="Simulates photo arriving from the patient mobile app"
            >
              <Smartphone size={13} /> From patient app
            </button>
          </div>
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f, 'door_camera')
          e.target.value = ''
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f, 'upload')
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function PatientAvatar({
  photoUrl,
  name,
  size = 36,
  className = '',
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || 'Patient'}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 bg-[var(--cf-surface-sunken)] ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-[var(--cf-brand-soft)] text-[var(--cf-brand)] grid place-items-center font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden
    >
      {initials}
    </div>
  )
}

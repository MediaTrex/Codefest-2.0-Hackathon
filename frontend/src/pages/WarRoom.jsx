import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Loader2,
  LogOut,
  Siren,
  Activity,
  Droplets,
  Wind,
  Thermometer,
  HeartPulse,
  Radio,
  ImageIcon,
  ArrowUpRight,
} from 'lucide-react'
import { fetchCase, fetchCases } from '../features/careflow/submitCase'
import { groupByStage, stageIdForCase, AGENT_STAGES } from '../utils/pipelineStage'
import DigitalTwinMap from '../components/careflow/DigitalTwinMap'

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Only flag critical — used for red accent on value, not card color. */
function isCriticalVital(key, value) {
  if (key === 'hr') return value >= 120 || value <= 45
  if (key === 'spo2') return value < 90
  if (key === 'rr') return value >= 28 || value <= 8
  if (key === 'temp') return value >= 39.5 || value <= 35
  const sys = Number(String(value).split('/')[0])
  return sys >= 180 || sys <= 85
}

function buildInitialLog(caseData) {
  const stage = AGENT_STAGES.find((s) => s.id === stageIdForCase(caseData))?.label || 'Intake'
  const doc = caseData.assignedDoctor?.name
  const t0 = caseData.createdAt ? new Date(caseData.createdAt).getTime() : Date.now()
  const rows = [
    { id: 'e1', at: t0, text: `Emergency case opened — ${caseData.patientName || 'patient'}` },
    { id: 'e2', at: t0 + 40000, text: `Moved to ${stage}` },
  ]
  if (doc) rows.push({ id: 'e3', at: t0 + 90000, text: `${doc} assigned` })
  rows.push({ id: 'e4', at: t0 + 140000, text: 'Bloodwork ordered' })
  rows.push({ id: 'e5', at: Date.now() - 20000, text: 'War Room activated' })
  return rows.sort((a, b) => b.at - a.at)
}

const DEMO_EVENTS = [
  'ECG strip reviewed',
  'IV access confirmed',
  'Imaging slot reserved',
  'Specialty consult pinged',
  'Vitals rechecked',
  'Family notified',
]

const card = 'rounded-lg border border-[#2a2e36] bg-[#14161b]'
const labelMuted = 'text-[11px] uppercase tracking-[0.06em] text-[#7d8694]'

export default function WarRoom() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [allCases, setAllCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [entered, setEntered] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [log, setLog] = useState([])
  const [vitals, setVitals] = useState({
    hr: 112,
    bp: '148/92',
    spo2: 93,
    rr: 24,
    temp: 37.8,
  })
  const [team, setTeam] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 180)
    return () => clearTimeout(t)
  }, [])

  const load = useCallback(async () => {
    try {
      const [detail, list] = await Promise.all([fetchCase(caseId), fetchCases()])
      setCaseData(detail)
      setAllCases(list)
      setLog(buildInitialLog(detail))
      const doc = detail.assignedDoctor?.name || 'Unassigned'
      setTeam([
        { id: 'doc', name: doc, role: 'Attending', status: 'In room' },
        { id: 'nurse', name: 'Nurse Priya Kapoor', role: 'Bedside nurse', status: 'In room' },
        { id: 'spec', name: 'Dr. Meera Iyer', role: 'On-call specialist', status: 'En route' },
      ])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setVitals((v) => {
        const hr = Math.max(70, Math.min(140, v.hr + Math.round((Math.random() - 0.45) * 4)))
        const spo2 = Math.max(
          86,
          Math.min(99, v.spo2 + (Math.random() > 0.55 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0))
        )
        const rr = Math.max(12, Math.min(32, v.rr + Math.round((Math.random() - 0.5) * 2)))
        const temp =
          Math.round(Math.max(36.2, Math.min(39.8, v.temp + (Math.random() - 0.5) * 0.1)) * 10) / 10
        const sys = Math.max(
          90,
          Math.min(190, Number(String(v.bp).split('/')[0]) + Math.round((Math.random() - 0.5) * 4))
        )
        const dia = Math.max(
          55,
          Math.min(120, Number(String(v.bp).split('/')[1]) + Math.round((Math.random() - 0.5) * 2))
        )
        return { hr, spo2, rr, temp, bp: `${sys}/${dia}` }
      })
    }, 2800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const text = DEMO_EVENTS[Math.floor(Math.random() * DEMO_EVENTS.length)]
      setLog((prev) => [
        { id: `live-${Date.now()}`, at: Date.now(), text, fresh: true },
        ...prev.slice(0, 24),
      ])
      setTeam((prev) =>
        prev.map((m, i) => {
          if (i !== 2) return m
          return Math.random() > 0.6
            ? { ...m, status: 'Reviewing' }
            : { ...m, status: 'En route' }
        })
      )
    }, 7000)
    return () => clearInterval(id)
  }, [])

  const stageGroups = useMemo(() => groupByStage(allCases), [allCases])
  const elapsed = caseData?.createdAt
    ? formatElapsed(now - new Date(caseData.createdAt).getTime())
    : '00:00'

  const pushAction = (text) => {
    setLog((prev) => [{ id: `act-${Date.now()}`, at: Date.now(), text, fresh: true }, ...prev])
    setToast(text)
    setTimeout(() => setToast(null), 2200)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e12] grid place-items-center text-[#9aa3b2]">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#0c0e12] grid place-items-center text-[#e8eaed] p-6 text-center">
        <div>
          <p className="text-[16px] font-semibold m-0">Case not found</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 text-[13px] text-[#c4c9d2] underline bg-transparent border-none cursor-pointer"
          >
            Exit War Room
          </button>
        </div>
      </div>
    )
  }

  const isEmergency = (caseData.urgency || '').toLowerCase() === 'emergency'

  const vitalTiles = [
    { key: 'hr', label: 'Heart rate', value: vitals.hr, unit: 'bpm', icon: HeartPulse },
    { key: 'bp', label: 'Blood pressure', value: vitals.bp, unit: 'mmHg', icon: Activity },
    { key: 'spo2', label: 'SpO₂', value: vitals.spo2, unit: '%', icon: Droplets },
    { key: 'rr', label: 'Resp. rate', value: vitals.rr, unit: '/min', icon: Wind },
    { key: 'temp', label: 'Temp', value: vitals.temp, unit: '°C', icon: Thermometer },
  ]

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: 'var(--cf-font-ui)',
        background: '#0c0e12',
        color: '#e8eaed',
      }}
    >
      <div
        className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4 transition-opacity duration-300"
        style={{ opacity: entered ? 1 : 0 }}
      >
        {/* Header */}
        <header className={`${card} px-4 py-3.5 flex flex-wrap items-center gap-4 justify-between`}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-[#c1121f] grid place-items-center shrink-0">
              <Siren size={18} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[20px] sm:text-[22px] font-semibold text-white m-0 tracking-tight truncate">
                  {caseData.patientName || 'Unknown patient'}
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-[#c1121f]/50 text-[#e8a0a6] bg-[#c1121f]/15">
                  Emergency
                </span>
                {!isEmergency && (
                  <span className="text-[10px] uppercase tracking-wide text-[#9aa3b2] border border-[#2a2e36] px-1.5 py-0.5 rounded">
                    Not marked emergency
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#7d8694] mt-1 mb-0">
                {caseId?.slice(0, 8)}…
                {caseData.topDiagnosis ? ` · ${caseData.topDiagnosis}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-right">
              <p className={`${labelMuted} m-0`}>Time since intake</p>
              <p className="text-[28px] font-semibold text-white leading-none m-0 mt-1 tracking-tight tabular-nums">
                {elapsed}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#e8a0a6]">
              <span className="w-2 h-2 rounded-full bg-[#c1121f] animate-pulse" />
              LIVE
            </span>
            <button
              type="button"
              onClick={() => navigate(`/case/${caseId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#2a2e36] bg-[#1a1d24] text-[#e8eaed] text-[13px] font-medium hover:bg-[#22262e] cursor-pointer"
            >
              <LogOut size={14} />
              Exit War Room
            </button>
          </div>
        </header>

        {/* Vitals — neutral cards; red value only if critical */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {vitalTiles.map((v) => {
            const critical = isCriticalVital(v.key, v.value)
            const Icon = v.icon
            return (
              <div key={v.key} className={`${card} px-3.5 py-3 min-w-0`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-[#7d8694]" strokeWidth={2} />
                  <p className={`${labelMuted} m-0 truncate`}>{v.label}</p>
                </div>
                <p
                  className={`text-[26px] font-semibold leading-none m-0 tabular-nums ${
                    critical ? 'text-white' : 'text-white'
                  }`}
                >
                  {v.value}
                  <span className="text-[11px] font-medium text-[#7d8694] ml-1.5">
                    {v.unit}
                  </span>
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-4">
          <div className="flex flex-col gap-4">
            <section className={`${card} p-4`}>
              <h2 className={`${labelMuted} m-0 mb-3`}>Assigned team</h2>
              <ul className="m-0 p-0 list-none divide-y divide-[#2a2e36]">
                {team.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full bg-[#1a1d24] border border-[#2a2e36] text-[#c4c9d2] grid place-items-center text-[11px] font-semibold shrink-0">
                      {initials(m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white m-0 truncate">{m.name}</p>
                      <p className="text-[12px] text-[#7d8694] m-0">{m.role}</p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded border border-[#2a2e36] bg-[#1a1d24] text-[#c4c9d2]">
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${card} p-4`}>
              <h2 className={`${labelMuted} m-0 mb-3`}>Quick actions</h2>
              <div className="grid grid-cols-1 gap-2">
                <ActionBtn
                  icon={ArrowUpRight}
                  label="Escalate to ICU"
                  primary
                  onClick={() => pushAction('Escalated to ICU — bed request sent')}
                />
                <ActionBtn
                  icon={Radio}
                  label="Page specialist"
                  onClick={() => {
                    pushAction('Specialist paged — awaiting acknowledge')
                    setTeam((prev) =>
                      prev.map((m) => (m.id === 'spec' ? { ...m, status: 'En route' } : m))
                    )
                  }}
                />
                <ActionBtn
                  icon={ImageIcon}
                  label="Order imaging"
                  onClick={() => pushAction('STAT imaging ordered')}
                />
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <DigitalTwinMap
              cases={allCases}
              stageGroups={stageGroups}
              focusCaseId={caseId}
              variant="war"
              compact
              liveTrack
              title="Patient position"
              subtitle="Live track · simulating movement through care zones"
              onSelectCase={() => {}}
              onTrackMove={({ from, to, patientName }) => {
                pushAction(`${patientName} moved ${from} → ${to}`)
              }}
            />

            <section className={`${card} p-4 flex-1 min-h-[200px]`}>
              <h2 className={`${labelMuted} m-0 mb-3`}>Action log</h2>
              <ul className="m-0 p-0 list-none space-y-0 max-h-[240px] overflow-y-auto">
                {log.map((e) => (
                  <li
                    key={e.id}
                    className={`flex gap-3 items-start py-2 border-b border-[#2a2e36] last:border-0 ${
                      e.fresh ? 'animate-[wrFade_0.35s_ease]' : ''
                    }`}
                  >
                    <span className="text-[11px] tabular-nums text-[#7d8694] shrink-0 pt-0.5 w-[52px]">
                      {new Date(e.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-[13px] text-[#e8eaed]">{e.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-md bg-[#1a1d24] text-[#e8eaed] text-[13px] font-medium border border-[#2a2e36] shadow-lg">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c1121f] mr-2 align-middle" />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes wrFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 min-h-[46px] rounded-md text-[14px] font-semibold cursor-pointer border transition-colors ${
        primary
          ? 'border-[#c1121f] bg-[#c1121f] text-white hover:bg-[#780000]'
          : 'border-[#2a2e36] bg-[#1a1d24] text-[#e8eaed] hover:bg-[#22262e]'
      }`}
    >
      <Icon size={16} strokeWidth={2} />
      {label}
    </button>
  )
}

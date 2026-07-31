import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { AGENT_STAGES, stageIdForCase } from '../../utils/pipelineStage'
import { severityOf, timeAgo, urgencyLabel } from '../../utils/status'

function layoutDims(size) {
  if (size === 'hero') {
    return {
      VIEW_W: 1280,
      VIEW_H: 480,
      PAD_X: 40,
      ZONE_W: 142,
      ZONE_H: 240,
      ZONE_Y: 100,
      DOT_R: 16,
      STAFF_SIZE: 13,
      minH: 440,
    }
  }
  return {
    VIEW_W: 1120,
    VIEW_H: 300,
    PAD_X: 36,
    ZONE_W: 118,
    ZONE_H: 148,
    ZONE_Y: 72,
    DOT_R: 14,
    STAFF_SIZE: 12,
    minH: 260,
  }
}

function zoneLayout(dims) {
  const { VIEW_W, PAD_X, ZONE_W, ZONE_H, ZONE_Y } = dims
  const n = AGENT_STAGES.length
  const gap = (VIEW_W - PAD_X * 2 - ZONE_W * n) / (n - 1)
  return AGENT_STAGES.map((stage, i) => {
    const x = PAD_X + i * (ZONE_W + gap)
    return {
      ...stage,
      x,
      y: ZONE_Y,
      w: ZONE_W,
      h: ZONE_H,
      cx: x + ZONE_W / 2,
      cy: ZONE_Y + ZONE_H / 2 + 10,
    }
  })
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function slotOffset(index, total) {
  const cols = Math.min(3, Math.max(1, total))
  const col = index % cols
  const row = Math.floor(index / cols)
  const spreadX = 28
  const spreadY = 26
  const startX = -((cols - 1) * spreadX) / 2
  return {
    dx: startX + col * spreadX,
    dy: -8 + row * spreadY,
  }
}

function urgencyFill(caseItem, isWar) {
  const sev = severityOf(caseItem)
  if (isWar) {
    if (sev === 'danger') return '#c1121f'
    if (sev === 'caution') return '#780000'
    return '#669bbc'
  }
  if (sev === 'danger') return '#c1121f'
  if (sev === 'caution') return '#003049'
  return '#669bbc'
}

/**
 * Load glow — blue / green only (War Room keeps red).
 */
function zoneLoad(casesInZone, isWar) {
  const n = casesInZone.length
  if (n === 0) return null
  if (isWar) {
    return {
      stroke: n >= 3 ? '#c1121f' : '#780000',
      shadow: 'rgba(193, 18, 31, 0.35)',
      pulse: n >= 3,
      intensity: Math.min(1, 0.3 + n / 5),
      level: n >= 3 ? 'high' : 'low',
    }
  }
  if (n >= 3) {
    return {
      stroke: '#c1121f',
      shadow: 'rgba(193, 18, 31, 0.28)',
      pulse: true,
      intensity: Math.min(1, 0.4 + n / 6),
      level: 'high',
    }
  }
  return {
    stroke: '#669bbc',
    shadow: 'rgba(102, 155, 188, 0.35)',
    pulse: false,
    intensity: Math.min(0.85, 0.22 + n / 5),
    level: 'low',
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export default function DigitalTwinMap({
  cases = [],
  stageGroups = {},
  onSelectCase,
  focusCaseId = null,
  variant = 'default',
  compact = false,
  size = 'default',
  title,
  subtitle,
  liveTrack = false,
  onTrackMove,
  /** Auto-glide patients along the corridor (Patient Movement). */
  demoMovement = false,
  onOccupancyChange,
}) {
  const isWar = variant === 'war'
  const isHero = size === 'hero'
  const dims = useMemo(() => layoutDims(isHero ? 'hero' : 'default'), [isHero])
  const {
    VIEW_W,
    VIEW_H,
    PAD_X,
    ZONE_Y,
    ZONE_H,
    DOT_R,
    STAFF_SIZE,
    minH,
  } = dims
  const CORRIDOR_Y = ZONE_Y + ZONE_H / 2
  const zones = useMemo(() => zoneLayout(dims), [dims])
  const zoneById = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z])),
    [zones]
  )

  const [playing, setPlaying] = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })

  const [trackIdx, setTrackIdx] = useState(0)
  const [glide, setGlide] = useState(null) // { caseId?, x, y }
  const [drift, setDrift] = useState({ dx: 0, dy: 0 })
  const [trackStatus, setTrackStatus] = useState('')
  const [stageOverrides, setStageOverrides] = useState({})
  const [demoStatus, setDemoStatus] = useState('')
  const [enteringIds, setEnteringIds] = useState(() => new Set())
  const [exitingMarkers, setExitingMarkers] = useState([])

  const glideRaf = useRef(0)
  const advancingRef = useRef(false)
  const frozenRef = useRef(null)
  const prevStageRef = useRef({})
  const knownIdsRef = useRef(new Set())
  const lastPosRef = useRef({})
  const stageOverridesRef = useRef({})
  const casesRef = useRef(cases)
  const [renderCases, setRenderCases] = useState([])
  const [glideTrail, setGlideTrail] = useState(null)

  useEffect(() => {
    stageOverridesRef.current = stageOverrides
  }, [stageOverrides])
  useEffect(() => {
    casesRef.current = cases
  }, [cases])

  const focusSeedIdx = useMemo(() => {
    if (!focusCaseId) return 0
    const c = cases.find((x) => x.caseId === focusCaseId)
    const id = stageIdForCase(c || {})
    const idx = AGENT_STAGES.findIndex((s) => s.id === id)
    return idx >= 0 ? idx : 0
  }, [cases, focusCaseId])

  useEffect(() => {
    if (!liveTrack || !focusCaseId) return
    setTrackIdx(focusSeedIdx)
    setTrackStatus(`In ${AGENT_STAGES[focusSeedIdx]?.label || 'Intake'}`)
    setGlide(null)
  }, [liveTrack, focusCaseId, focusSeedIdx])

  const runGlide = (fromZone, toZone, caseId, onDone) => {
    if (glideRaf.current) cancelAnimationFrame(glideRaf.current)
    const start = performance.now()
    const DUR = 1600
    setGlideTrail({
      x1: fromZone.cx,
      y1: fromZone.cy,
      x2: toZone.cx,
      y2: toZone.cy,
    })
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DUR)
      const e = easeInOut(t)
      let x
      let y
      if (e < 0.28) {
        const u = e / 0.28
        x = fromZone.cx
        y = fromZone.cy + (CORRIDOR_Y - fromZone.cy) * u
      } else if (e < 0.78) {
        const u = (e - 0.28) / 0.5
        x = fromZone.cx + (toZone.cx - fromZone.cx) * u
        y = CORRIDOR_Y
      } else {
        const u = (e - 0.78) / 0.22
        x = toZone.cx
        y = CORRIDOR_Y + (toZone.cy - CORRIDOR_Y) * u
      }
      setGlide({ caseId: caseId || null, x, y })
      if (t < 1) {
        glideRaf.current = requestAnimationFrame(tick)
      } else {
        setGlide(null)
        setGlideTrail(null)
        advancingRef.current = false
        onDone?.()
      }
    }
    advancingRef.current = true
    glideRaf.current = requestAnimationFrame(tick)
  }

  // War Room focused track
  useEffect(() => {
    if (!liveTrack || !playing || !focusCaseId) return undefined
    const ADVANCE_MS = 4800
    const id = setInterval(() => {
      if (advancingRef.current) return
      setTrackIdx((prev) => {
        const next = prev >= AGENT_STAGES.length - 1 ? 0 : prev + 1
        const fromZ = zoneById[AGENT_STAGES[prev].id]
        const toZ = zoneById[AGENT_STAGES[next].id]
        if (!fromZ || !toZ) return next
        setTrackStatus(
          `Moving ${AGENT_STAGES[prev].label} → ${AGENT_STAGES[next].label}`
        )
        onTrackMove?.({
          from: AGENT_STAGES[prev].label,
          to: AGENT_STAGES[next].label,
          patientName:
            cases.find((c) => c.caseId === focusCaseId)?.patientName ||
            'Patient',
        })
        runGlide(fromZ, toZ, focusCaseId, () => {
          setTrackStatus(`In ${AGENT_STAGES[next].label}`)
        })
        return next
      })
    }, ADVANCE_MS)
    return () => {
      clearInterval(id)
      if (glideRaf.current) cancelAnimationFrame(glideRaf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTrack, playing, focusCaseId, zoneById])

  // Floor demo — visible corridor glides every few seconds
  useEffect(() => {
    if (!demoMovement || liveTrack || !playing) return undefined

    const advanceOne = () => {
      if (advancingRef.current) return
      const pool = casesRef.current.filter((c) =>
        zoneById[stageOverridesRef.current[c.caseId] || stageIdForCase(c)]
      )
      if (!pool.length) return
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const currentId =
        stageOverridesRef.current[pick.caseId] || stageIdForCase(pick)
      const idx = AGENT_STAGES.findIndex((s) => s.id === currentId)
      const fromIdx = idx >= 0 ? idx : 0
      const nextIdx =
        fromIdx >= AGENT_STAGES.length - 1 ? 0 : fromIdx + 1
      const fromZ = zoneById[AGENT_STAGES[fromIdx].id]
      const toZ = zoneById[AGENT_STAGES[nextIdx].id]
      if (!fromZ || !toZ) return

      const fromLabel = AGENT_STAGES[fromIdx].label
      const toLabel = AGENT_STAGES[nextIdx].label
      setDemoStatus(
        `Moving ${pick.patientName || 'Patient'} · ${fromLabel} → ${toLabel}`
      )
      runGlide(fromZ, toZ, pick.caseId, () => {
        setStageOverrides((prev) => ({
          ...prev,
          [pick.caseId]: AGENT_STAGES[nextIdx].id,
        }))
        setDemoStatus(
          `${pick.patientName || 'Patient'} arrived · ${toLabel}`
        )
        setTimeout(() => {
          setDemoStatus((s) =>
            s?.includes('arrived') ? 'Live floor · patients in motion' : s
          )
        }, 1600)
      })
    }

    const kick = setTimeout(() => {
      setDemoStatus('Live floor · patients in motion')
      advanceOne()
    }, 600)
    const id = setInterval(advanceOne, 2800)
    return () => {
      clearTimeout(kick)
      clearInterval(id)
      if (glideRaf.current) cancelAnimationFrame(glideRaf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMovement, liveTrack, playing, zoneById, cases.length])

  // Subtle idle drift while waiting (demo + war track)
  useEffect(() => {
    if ((!liveTrack && !demoMovement) || !playing) {
      setDrift({ dx: 0, dy: 0 })
      return undefined
    }
    const id = setInterval(() => {
      if (advancingRef.current) return
      setDrift({
        dx: (Math.random() - 0.5) * 14,
        dy: (Math.random() - 0.5) * 10,
      })
    }, 1200)
    return () => clearInterval(id)
  }, [liveTrack, demoMovement, playing])

  const activeCases = useMemo(() => {
    return cases
      .map((c) => {
        let stageId = stageIdForCase(c)
        if (liveTrack && focusCaseId && c.caseId === focusCaseId) {
          stageId = AGENT_STAGES[trackIdx]?.id || stageId
        } else if (stageOverrides[c.caseId]) {
          stageId = stageOverrides[c.caseId]
        }
        return { ...c, stageId }
      })
      .filter((c) => zoneById[c.stageId])
      .filter((c) => {
        if (!focusCaseId) return true
        if (liveTrack) return true
        return c.caseId === focusCaseId
      })
  }, [cases, zoneById, focusCaseId, liveTrack, trackIdx, stageOverrides])

  const focusTrail = useMemo(() => {
    if (!focusCaseId) return []
    const idx = liveTrack
      ? trackIdx
      : AGENT_STAGES.findIndex(
          (s) =>
            s.id ===
            activeCases.find((c) => c.caseId === focusCaseId)?.stageId
        )
    if (idx < 0) return []
    return AGENT_STAGES.slice(0, idx + 1)
      .map((s) => zoneById[s.id])
      .filter(Boolean)
  }, [focusCaseId, liveTrack, trackIdx, activeCases, zoneById])

  useEffect(() => {
    if (focusCaseId && liveTrack) {
      setSelectedZone(AGENT_STAGES[trackIdx]?.id || null)
      return
    }
    const focused = activeCases.find((c) => c.caseId === focusCaseId)
    if (focusCaseId && focused) setSelectedZone(focused.stageId)
  }, [focusCaseId, activeCases, liveTrack, trackIdx])

  useEffect(() => {
    if (!playing) {
      if (!frozenRef.current) {
        frozenRef.current = activeCases.map((c) => ({ ...c }))
      }
      setRenderCases(frozenRef.current)
      return
    }
    frozenRef.current = null
    setRenderCases(activeCases)
  }, [activeCases, playing])

  useEffect(() => {
    for (const c of renderCases) {
      prevStageRef.current[c.caseId] = c.stageId
    }
  }, [renderCases])

  const patientsByZone = useMemo(() => {
    const map = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, []]))
    for (const c of renderCases) {
      if (map[c.stageId]) map[c.stageId].push(c)
    }
    return map
  }, [renderCases])

  const patientMarkers = useMemo(() => {
    const markers = []
    for (const stage of AGENT_STAGES) {
      const list = patientsByZone[stage.id] || []
      list.forEach((c, i) => {
        const zone = zoneById[stage.id]
        const { dx, dy } = slotOffset(i, list.length)
        const isFocus = focusCaseId && c.caseId === focusCaseId
        const isGliding = Boolean(glide && glide.caseId === c.caseId)
        let x = zone.cx + dx
        let y = zone.cy + dy
        if (isGliding) {
          x = glide.x
          y = glide.y
        } else if (isFocus && liveTrack) {
          x = zone.cx + drift.dx
          y = zone.cy + drift.dy
        } else if (demoMovement && playing) {
          const seed = (c.caseId?.charCodeAt?.(0) || i) % 5
          x = zone.cx + dx + drift.dx * (0.35 + seed * 0.12)
          y = zone.cy + dy + drift.dy * (0.35 + seed * 0.12)
        }
        markers.push({
          id: c.caseId,
          kind: 'patient',
          caseItem: c,
          stageId: stage.id,
          stageLabel: stage.label,
          x,
          y,
          fill: urgencyFill(c, isWar),
          label: initials(c.patientName),
          name: c.patientName || 'Unknown',
          isFocus,
          isGliding,
        })
      })
    }
    return markers
  }, [
    patientsByZone,
    zoneById,
    isWar,
    focusCaseId,
    liveTrack,
    demoMovement,
    playing,
    glide,
    drift,
  ])

  useEffect(() => {
    if (!onOccupancyChange) return
    const counts = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, 0]))
    for (const c of renderCases) {
      if (counts[c.stageId] != null) counts[c.stageId] += 1
    }
    onOccupancyChange(counts)
  }, [renderCases, onOccupancyChange])

  const staffMarkers = useMemo(() => {
    const byDoctor = new Map()
    for (const c of renderCases) {
      const doc = c.assignedDoctor
      if (!doc?.name && !doc?.id) continue
      const key = doc.id || doc.name
      if (!byDoctor.has(key)) {
        byDoctor.set(key, { doctor: doc, stages: {} })
      }
      const entry = byDoctor.get(key)
      entry.stages[c.stageId] = (entry.stages[c.stageId] || 0) + 1
    }
    const markers = []
    let i = 0
    for (const [, entry] of byDoctor) {
      const bestStage =
        Object.entries(entry.stages).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        AGENT_STAGES[0].id
      const zone = zoneById[bestStage]
      if (!zone) continue
      const angle = (i / Math.max(byDoctor.size, 1)) * Math.PI * 2
      const ox = Math.cos(angle) * 36
      const oy = Math.sin(angle) * 22 - 42
      markers.push({
        id: `staff-${entry.doctor.id || entry.doctor.name}`,
        kind: 'staff',
        stageId: bestStage,
        stageLabel: zone.label,
        x: zone.cx + ox,
        y: zone.cy + oy,
        name: entry.doctor.name || 'Staff',
        label: initials(entry.doctor.name || 'S'),
      })
      i++
    }
    return markers
  }, [renderCases, zoneById])

  // Entrance / exit animations
  useEffect(() => {
    const all = [...patientMarkers, ...staffMarkers]
    for (const m of all) {
      lastPosRef.current[m.id] = { x: m.x, y: m.y, ...m }
    }
    const ids = new Set(all.map((m) => m.id))
    const prev = knownIdsRef.current
    const entered = [...ids].filter((id) => !prev.has(id))
    const left = [...prev].filter((id) => !ids.has(id))

    if (entered.length) {
      setEnteringIds((s) => {
        const next = new Set(s)
        entered.forEach((id) => next.add(id))
        return next
      })
      const t = setTimeout(() => {
        setEnteringIds((s) => {
          const next = new Set(s)
          entered.forEach((id) => next.delete(id))
          return next
        })
      }, 220)
      knownIdsRef.current = ids
      return () => clearTimeout(t)
    }

    if (left.length) {
      const ghosts = left
        .map((id) => lastPosRef.current[id])
        .filter(Boolean)
        .map((m) => ({ ...m, exiting: true }))
      setExitingMarkers((prevG) => [...prevG, ...ghosts])
      const t = setTimeout(() => {
        setExitingMarkers((prevG) =>
          prevG.filter((g) => !left.includes(g.id))
        )
      }, 200)
      knownIdsRef.current = ids
      return () => clearTimeout(t)
    }

    knownIdsRef.current = ids
  }, [patientMarkers, staffMarkers])

  const groupsForGlow = useMemo(() => {
    if (Object.keys(stageGroups || {}).length) {
      // Merge demo overrides into counts for glow
      const merged = { ...stageGroups }
      for (const c of renderCases) {
        // Prefer live renderCases for glow when demoing
      }
      if (demoMovement) {
        return patientsByZone
      }
      return merged
    }
    return patientsByZone
  }, [stageGroups, patientsByZone, demoMovement, renderCases])

  const dimmed = Boolean(selectedZone)

  const hoveredMarker = useMemo(() => {
    if (!hoveredId) return null
    return (
      patientMarkers.find((m) => m.id === hoveredId) ||
      staffMarkers.find((m) => m.id === hoveredId) ||
      null
    )
  }, [hoveredId, patientMarkers, staffMarkers])

  const onZoneClick = (zoneId) => {
    if (liveTrack && focusCaseId) return
    setSelectedZone((prev) => (prev === zoneId ? null : zoneId))
  }

  const shellClass = isWar
    ? 'rounded-lg border border-[#2a2e36] bg-[#14161b] p-4'
    : 'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5 shadow-sm'
  const titleClass = isWar
    ? 'text-[11px] font-semibold text-[#7d8694] tracking-[0.06em] uppercase'
    : 'text-[13px] font-semibold text-[var(--cf-ink)] tracking-wide uppercase'
  const subClass = isWar
    ? 'text-[12px] text-[#7d8694] mt-0.5'
    : 'text-[13px] text-[var(--cf-ink-faint)] mt-0.5'

  const statusLine =
    (liveTrack && trackStatus) ||
    demoStatus ||
    subtitle ||
    (focusCaseId
      ? 'Live track · path trail from intake to current zone'
      : 'Live positions across the hospital floor')

  const renderMarkerButton = (m, opts = {}) => {
    const exiting = opts.exiting
    const isMoving = Boolean(m.isGliding || (glide && glide.caseId === m.id))
    const isDim =
      !exiting &&
      !isMoving &&
      dimmed &&
      selectedZone &&
      m.stageId !== selectedZone &&
      !m.isFocus
    const focusLive = m.isFocus && liveTrack
    const isStaff = m.kind === 'staff'
    const size = isStaff
      ? STAFF_SIZE + 6
      : isMoving
        ? DOT_R * 2 + 10
        : focusLive
          ? DOT_R * 2 + 6
          : DOT_R * 2
    const entering = enteringIds.has(m.id)
    const hovered = hoveredId === m.id

    return (
      <button
        key={`${m.id}${exiting ? '-out' : ''}`}
        type="button"
        className={`absolute pointer-events-auto border-none p-0 cursor-pointer bg-transparent ${
          exiting ? 'dt-marker-exit' : entering ? 'dt-marker-enter' : ''
        }`}
        style={{
          left: `${(m.x / VIEW_W) * 100}%`,
          top: `${(m.y / VIEW_H) * 100}%`,
          transform: isStaff
            ? `translate(-50%, calc(-50% + ${hovered && !exiting ? '-2px' : '0px'})) rotate(45deg)`
            : `translate(-50%, calc(-50% + ${hovered && !exiting ? '-2px' : '0px'}))`,
          width: size,
          height: size,
          opacity: exiting
            ? undefined
            : isDim
              ? 0.22
              : focusLive || isMoving
                ? 1
                : liveTrack && focusCaseId && !m.isFocus
                  ? 0.45
                  : 1,
          transition: isMoving
            ? 'opacity 120ms ease, width 180ms ease, height 180ms ease'
            : 'left 480ms ease-in-out, top 480ms ease-in-out, opacity 200ms ease, transform 180ms ease',
          zIndex: isMoving ? 12 : m.isFocus ? 8 : hovered ? 7 : isStaff ? 2 : 3,
          pointerEvents: exiting ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => {
          if (exiting) return
          setHoveredId(m.id)
          const rect = e.currentTarget.parentElement.getBoundingClientRect()
          setTipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          })
        }}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => {
          if (!isStaff) onSelectCase?.(m.id)
        }}
        aria-label={`${isStaff ? 'Staff' : 'Patient'} ${m.name}`}
      >
        {isStaff ? (
          <span
            className={`block w-full h-full rounded-[3px] border ${
              playing && !isWar ? 'dt-staff-pulse' : ''
            }`}
            style={{
              background: isWar ? '#6b7280' : '#669bbc',
              borderColor: isWar ? '#9aa3b2' : '#fff',
              boxShadow: isWar
                ? 'none'
                : '0 2px 6px rgba(15, 23, 42, 0.18)',
            }}
          />
        ) : (
          <span
            className={`flex items-center justify-center w-full h-full rounded-full text-white font-semibold ${
              isMoving
                ? 'dt-glide-pulse'
                : focusLive && playing
                  ? 'dt-focus-pulse'
                  : ''
            }`}
            style={{
              fontSize: isMoving || focusLive ? 10 : 9,
              background: isWar
                ? m.fill
                : `linear-gradient(135deg, ${m.fill} 0%, #003049 100%)`,
              boxShadow: isWar
                ? focusLive || isMoving
                  ? '0 0 0 2px #fafafa, 0 0 10px rgba(255,255,255,0.2)'
                  : '0 0 0 2px #2a2e36'
                : isMoving
                  ? '0 0 0 3px #ffffff, 0 0 0 6px rgba(59,130,246,0.45), 0 6px 16px rgba(15,23,42,0.28)'
                  : focusLive
                    ? '0 0 0 2px #ffffff, 0 0 0 4px rgba(102,155,188,0.35), 0 4px 12px rgba(15,23,42,0.18)'
                    : '0 0 0 2px #ffffff, 0 3px 8px rgba(15, 23, 42, 0.18)',
            }}
          >
            {m.label}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`${shellClass} dt-shell`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h3 className={titleClass}>
            {title ||
              (focusCaseId
                ? 'Patient position'
                : 'Hospital floor · digital twin')}
          </h3>
          <p className={subClass}>{statusLine}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(!compact || isHero || liveTrack || demoMovement) && (
            <button
              type="button"
              aria-label={playing ? 'Pause movement' : 'Play movement'}
              onClick={() => setPlaying((p) => !p)}
              className={
                isWar
                  ? 'w-7 h-7 grid place-items-center rounded-md border border-[#2a2e36] text-[#c4c9d2] hover:bg-[#1a1d24] bg-[#1a1d24] cursor-pointer'
                  : 'w-8 h-8 grid place-items-center rounded-full border border-[var(--cf-border)] bg-white text-[var(--cf-brand)] hover:bg-[var(--cf-surface-sunken)] cursor-pointer shadow-sm'
              }
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
          )}
          <span
            className={
              isWar
                ? 'inline-flex items-center gap-1.5 text-[12px] text-[#d4d4d8]'
                : 'inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--cf-ink-soft)] px-2.5 py-1 rounded-full border border-[var(--cf-border)] bg-white'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWar ? 'bg-[#ef4444]' : 'bg-[#3b82f6]'
              } ${playing ? 'animate-pulse' : ''}`}
            />
            Live
          </span>
        </div>
      </div>

      <div
        className={`mt-3 overflow-x-auto rounded-xl border relative ${
          isWar
            ? 'border-[#2a2e36] bg-[#0c0e12]'
            : 'border-[var(--cf-border)] bg-[#f8fafc]'
        }`}
      >
        <div className="relative w-full" style={{ minWidth: 640 }}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-auto block"
            style={{ minHeight: compact && !isHero ? 200 : minH }}
            role="img"
            aria-label="Hospital floor plan digital twin"
          >
            <defs>
              <linearGradient id="dt-light-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>
              <linearGradient id="dt-red-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0c0e12" />
                <stop offset="100%" stopColor="#14161b" />
              </linearGradient>
              <pattern
                id="dt-grid-light"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="0.75"
                />
              </pattern>
              <pattern
                id="dt-grid-war"
                width="22"
                height="22"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 22 0 L 0 0 0 22"
                  fill="none"
                  stroke="#3a3f4a"
                  strokeOpacity="0.45"
                  strokeWidth="0.7"
                />
              </pattern>
              {zones.map((z) => {
                const load = zoneLoad(groupsForGlow[z.id] || [], isWar)
                if (!load) return null
                return (
                  <filter
                    key={`glow-${z.id}`}
                    id={`zone-glow-${z.id}`}
                    x="-40%"
                    y="-40%"
                    width="180%"
                    height="180%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation={
                        load.level === 'high'
                          ? 5 + load.intensity * 3
                          : 2.5 + load.intensity * 2
                      }
                      floodColor={load.shadow}
                      floodOpacity={0.95}
                    />
                  </filter>
                )
              })}
            </defs>

            <rect
              width={VIEW_W}
              height={VIEW_H}
              fill={isWar ? 'url(#dt-red-bg)' : 'url(#dt-light-bg)'}
            />
            {!isWar && (
              <rect width={VIEW_W} height={VIEW_H} fill="url(#dt-grid-light)" />
            )}
            {isWar && (
              <rect width={VIEW_W} height={VIEW_H} fill="url(#dt-grid-war)" />
            )}

            <rect
              x="16"
              y="28"
              width={VIEW_W - 32}
              height={VIEW_H - 48}
              rx="14"
              fill={isWar ? '#141414' : '#ffffff'}
              stroke={isWar ? '#3f3f46' : '#e4e4e7'}
              strokeWidth="1.25"
            />

            {/* Animated corridor flow */}
            <line
              x1={PAD_X}
              y1={CORRIDOR_Y}
              x2={VIEW_W - PAD_X}
              y2={CORRIDOR_Y}
              stroke={isWar ? '#52525b' : '#bfdbfe'}
              strokeWidth="1.75"
              strokeDasharray="5 10"
              className={playing ? 'dt-dash-flow' : undefined}
            />
            {!isWar && (
              <line
                x1={PAD_X}
                y1={CORRIDOR_Y}
                x2={VIEW_W - PAD_X}
                y2={CORRIDOR_Y}
                stroke="#3b82f6"
                strokeWidth="1"
                strokeOpacity="0.22"
                strokeDasharray="3 14"
                className={playing ? 'dt-dash-flow-slow' : undefined}
              />
            )}

            {focusTrail.length > 1 && (
              <polyline
                points={focusTrail
                  .map((z) => `${z.cx},${CORRIDOR_Y}`)
                  .join(' ')}
                fill="none"
                stroke={isWar ? '#e8a0a6' : '#003049'}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.85}
              />
            )}

            {glideTrail && (
              <path
                d={`M ${glideTrail.x1} ${glideTrail.y1} L ${glideTrail.x1} ${CORRIDOR_Y} L ${glideTrail.x2} ${CORRIDOR_Y} L ${glideTrail.x2} ${glideTrail.y2}`}
                fill="none"
                stroke={isWar ? '#f87171' : '#3b82f6'}
                strokeWidth={2.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.9}
                className="dt-glide-trail"
              />
            )}
            {glide && (
              <circle
                cx={glide.x}
                cy={glide.y}
                r={18}
                fill={isWar ? 'rgba(248,113,113,0.18)' : 'rgba(59,130,246,0.16)'}
                stroke={isWar ? '#f87171' : '#3b82f6'}
                strokeWidth={1.25}
                strokeOpacity={0.7}
                className="dt-glide-halo"
              />
            )}

            {zones.map((z) => {
              const list = groupsForGlow[z.id] || []
              const count = list.length
              const load = zoneLoad(list, isWar)
              const isSelected = selectedZone === z.id
              const isDim = dimmed && !isSelected
              const scale = isSelected ? 1.05 : 1

              let fill = '#f8fafc'
              let stroke = '#e2e8f0'
              let titleFill = '#1e293b'
              let countFill = '#64748b'

              if (isWar) {
                fill = isSelected ? '#27272a' : '#18181b'
                stroke = isSelected ? '#fafafa' : '#3f3f46'
                titleFill = '#fafafa'
                countFill = '#a1a1aa'
              } else if (isSelected) {
                fill = '#e8f1f6'
                stroke = '#003049'
                titleFill = '#1e3a8a'
                countFill = '#669bbc'
              } else if (load?.level === 'high') {
                fill = '#e4eef4'
                stroke = load.stroke
                titleFill = '#003049'
                countFill = '#669bbc'
              } else if (load) {
                fill = '#e8f1f6'
                stroke = load.stroke
                titleFill = '#1e293b'
                countFill = '#669bbc'
              }

              return (
                <g
                  key={z.id}
                  onClick={() => onZoneClick(z.id)}
                  filter={load ? `url(#zone-glow-${z.id})` : undefined}
                  style={{
                    cursor: 'pointer',
                    opacity: isDim ? 0.4 : 1,
                    transformOrigin: `${z.cx}px ${z.cy}px`,
                    transform: `scale(${scale})`,
                    transition:
                      'opacity 250ms ease, transform 250ms ease',
                  }}
                >
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx="12"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2.25 : 1.25}
                    className={
                      !isWar && load?.pulse && playing
                        ? 'dt-zone-pulse-soft'
                        : undefined
                    }
                  />
                  <text
                    x={z.cx}
                    y={z.y + 24}
                    textAnchor="middle"
                    fontFamily="var(--cf-font-ui)"
                    fontSize="12"
                    fontWeight="600"
                    fill={titleFill}
                  >
                    {z.label}
                  </text>
                  <text
                    x={z.cx}
                    y={z.y + 42}
                    textAnchor="middle"
                    fontFamily="var(--cf-font-ui)"
                    fontSize="10"
                    fill={countFill}
                  >
                    {count} {count === 1 ? 'person' : 'people'}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className="absolute inset-0 pointer-events-none">
            {exitingMarkers.map((m) => renderMarkerButton(m, { exiting: true }))}
            {staffMarkers.map((m) => renderMarkerButton(m))}
            {patientMarkers.map((m) => renderMarkerButton(m))}
          </div>

          {hoveredMarker && (
            <div
              className="absolute z-30 pointer-events-none rounded-xl border border-[var(--cf-border)] bg-white px-3.5 py-2.5 shadow-lg min-w-[180px]"
              style={{
                left: Math.min(tipPos.x + 14, VIEW_W * 0.55),
                top: Math.max(10, tipPos.y - 72),
              }}
            >
              <div className="flex items-center gap-2">
                {hoveredMarker.kind === 'patient' ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: hoveredMarker.fill }}
                  />
                ) : (
                  <span
                    className="w-2 h-2 shrink-0 bg-[#059669] border border-white"
                    style={{ transform: 'rotate(45deg)' }}
                  />
                )}
                <p className="text-[13px] font-semibold text-[var(--cf-ink)] m-0 truncate">
                  {hoveredMarker.name}
                </p>
              </div>
              <p className="text-[12px] text-[var(--cf-ink-soft)] mt-1.5 mb-0">
                {hoveredMarker.kind === 'staff'
                  ? `Staff · ${hoveredMarker.stageLabel}`
                  : `${urgencyLabel(hoveredMarker.caseItem?.urgency)} · ${hoveredMarker.stageLabel}`}
              </p>
              <p className="text-[11px] text-[var(--cf-ink-faint)] mt-0.5 mb-0">
                {hoveredMarker.kind === 'patient'
                  ? `In zone · ${timeAgo(hoveredMarker.caseItem?.createdAt) || '—'}`
                  : 'Actively working'}
              </p>
            </div>
          )}
        </div>
      </div>

      {(!compact || isHero) && (
        <div
          className={`flex flex-wrap items-center gap-4 mt-3 pt-3 border-t text-[12px] ${
            isWar
              ? 'border-[#2a2e36] text-[#7d8694]'
              : 'border-[var(--cf-border)] text-[var(--cf-ink-faint)]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: isWar ? '#c1121f' : '#669bbc',
                boxShadow: isWar ? undefined : '0 0 0 1.5px #fff',
              }}
            />
            Patient
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 border border-white"
              style={{
                transform: 'rotate(45deg)',
                background: isWar ? '#6b7280' : '#669bbc',
              }}
            />
            Staff
          </span>
          {!isWar && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-[#a8c9db] bg-[#e8f1f6]" />
                Light load
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-[#669bbc] bg-[#e4eef4]" />
                High load
              </span>
            </>
          )}
          <span className="ml-auto text-[var(--cf-ink-faint)]">
            {selectedZone
              ? `Focused · ${zoneById[selectedZone]?.label} · click again to clear`
              : 'Click a zone to focus · hover a marker for detail'}
          </span>
        </div>
      )}

      <style>{`
        @keyframes dt-zone-pulse-soft {
          0%, 100% { stroke-opacity: 1; }
          50% { stroke-opacity: 0.55; }
        }
        .dt-zone-pulse-soft {
          animation: dt-zone-pulse-soft 2.4s ease-in-out infinite;
        }
        @keyframes dt-dash-flow {
          to { stroke-dashoffset: -30; }
        }
        .dt-dash-flow {
          animation: dt-dash-flow 3.5s linear infinite;
        }
        .dt-dash-flow-slow {
          animation: dt-dash-flow 4.2s linear infinite;
        }
        @keyframes dt-focus-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .dt-focus-pulse {
          animation: dt-focus-pulse 1.8s ease-in-out infinite;
        }
        @keyframes dt-glide-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .dt-glide-pulse {
          animation: dt-glide-pulse 0.55s ease-in-out infinite;
        }
        @keyframes dt-glide-trail-draw {
          from { stroke-dashoffset: 80; }
          to { stroke-dashoffset: 0; }
        }
        .dt-glide-trail {
          stroke-dasharray: 8 6;
          animation: dt-glide-trail-draw 0.9s ease-out forwards, dt-dash-flow 1.4s linear infinite;
        }
        @keyframes dt-glide-halo {
          0%, 100% { opacity: 0.45; transform: scale(0.92); }
          50% { opacity: 0.95; transform: scale(1.08); }
        }
        .dt-glide-halo {
          transform-box: fill-box;
          transform-origin: center;
          animation: dt-glide-halo 0.7s ease-in-out infinite;
        }
        @keyframes dt-staff-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .dt-staff-pulse {
          animation: dt-staff-pulse 2s ease-in-out infinite;
        }
        @keyframes dt-marker-enter-inner {
          0% { opacity: 0; transform: scale(0.72); }
          70% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        .dt-marker-enter > span {
          animation: dt-marker-enter-inner 180ms ease-out;
        }
        @keyframes dt-marker-exit-inner {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.7); }
        }
        .dt-marker-exit > span {
          animation: dt-marker-exit-inner 180ms ease-in forwards;
        }
        .dt-marker-exit {
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

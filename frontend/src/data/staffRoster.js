/** Demo staff roster — merges with /careflow/staff + live case assignments. */

export const STAFF_ROSTER = [
  {
    id: 'dr-mehta',
    name: 'Dr. Ananya Mehta',
    role: 'Doctor',
    department: 'Internal Medicine',
    shift: 'Morning',
    baseStatus: 'available',
  },
  {
    id: 'dr-rao',
    name: 'Dr. Vikram Rao',
    role: 'Doctor',
    department: 'Cardiology',
    shift: 'Morning',
    baseStatus: 'available',
  },
  {
    id: 'dr-chen',
    name: 'Dr. Lisa Chen',
    role: 'Specialist',
    department: 'Pulmonology',
    shift: 'Afternoon',
    baseStatus: 'available',
  },
  {
    id: 'dr-anubappal',
    name: 'Dr. Anubappal',
    role: 'Doctor',
    department: 'Emergency',
    shift: 'Morning',
    baseStatus: 'available',
  },
  {
    id: 'rn-kapoor',
    name: 'Nurse Priya Kapoor',
    role: 'Nurse',
    department: 'Emergency',
    shift: 'Morning',
    baseStatus: 'available',
  },
  {
    id: 'rn-singh',
    name: 'Nurse Arjun Singh',
    role: 'Nurse',
    department: 'Triage',
    shift: 'Afternoon',
    baseStatus: 'off',
  },
  {
    id: 'sp-iyer',
    name: 'Dr. Meera Iyer',
    role: 'Specialist',
    department: 'Neurology',
    shift: 'Night',
    baseStatus: 'available',
  },
  {
    id: 'rn-verma',
    name: 'Nurse Ravi Verma',
    role: 'Nurse',
    department: 'ICU',
    shift: 'Night',
    baseStatus: 'off',
  },
]

export const DEPARTMENTS = [
  ...new Set(STAFF_ROSTER.map((s) => s.department)),
].sort()

export const SHIFTS = ['Morning', 'Afternoon', 'Night']

/**
 * Derive live status + case load from assigned cases.
 * emergency → in_surgery, has cases → with_patient, else baseStatus.
 */
export function enrichStaff(roster = STAFF_ROSTER, cases = []) {
  return roster.map((member) => {
    const assigned = cases.filter(
      (c) =>
        c.assignedDoctor?.id === member.id ||
        c.assignedDoctor?.name === member.name
    )
    let status = member.baseStatus
    if (member.baseStatus === 'off') {
      status = 'off'
    } else if (assigned.some((c) => (c.urgency || '').toLowerCase() === 'emergency')) {
      status = 'in_surgery'
    } else if (assigned.length > 0) {
      status = 'with_patient'
    } else {
      status = 'available'
    }
    return {
      ...member,
      status,
      cases: assigned,
      caseCount: assigned.length,
    }
  })
}

export function statusMeta(status) {
  switch (status) {
    case 'available':
      return { label: 'Available', tone: 'safe', pulse: false }
    case 'with_patient':
      return { label: 'With patient', tone: 'caution', pulse: true }
    case 'in_surgery':
      return { label: 'In surgery', tone: 'danger', pulse: true }
    default:
      return { label: 'Off shift', tone: 'idle', pulse: false }
  }
}

export const WEEK_SHIFTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function weekSchedule(member) {
  // Deterministic demo schedule from id hash
  const seed = (member.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return WEEK_SHIFTS.map((day, i) => {
    if (member.baseStatus === 'off' && i >= 5) return { day, slot: 'Off' }
    const rot = (seed + i) % 3
    const slot =
      rot === 0 ? member.shift : rot === 1 ? 'Off' : member.shift === 'Night' ? 'Night' : member.shift
    return { day, slot }
  })
}

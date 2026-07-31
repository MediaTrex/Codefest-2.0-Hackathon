import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import getCurrentUser from './features/getCurrentUser'
import { setUserdata } from './redux/userSlice'
import AuthGate from './components/AuthGate'
import AppShell from './components/layout/AppShell'
import CommandCenter from './pages/CommandCenter'
import AddPatient from './pages/AddPatient'
import CaseQueue from './pages/CaseQueue'
import CaseDetail from './pages/CaseDetail'
import AnalyticsPage from './pages/AnalyticsPage'
import Reports from './pages/Reports'
import StaffPage from './pages/StaffPage'
import WarRoom from './pages/WarRoom'
import PatientMovement from './pages/PatientMovement'

function ShellRoutes() {
  const location = useLocation()
  const isWarRoom = location.pathname.startsWith('/war-room')

  if (isWarRoom) {
    return (
      <Routes>
        <Route path="/war-room/:caseId" element={<WarRoom />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/intake" element={<AddPatient />} />
        <Route path="/queue" element={<CaseQueue />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/movement" element={<PatientMovement />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
      </Routes>
    </AppShell>
  )
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const getUser = async () => {
      const data = await getCurrentUser()
      dispatch(setUserdata(data))
    }
    getUser()
  }, [dispatch])

  return (
    <BrowserRouter>
      <AuthGate>
        <ShellRoutes />
      </AuthGate>
    </BrowserRouter>
  )
}

export default App

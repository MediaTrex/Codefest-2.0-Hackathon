import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import DeathOrganization from './pages/DeathOrganization'
import Reports from './pages/Reports'

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
        <AppShell>
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/intake" element={<AddPatient />} />
            <Route path="/queue" element={<CaseQueue />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/death" element={<DeathOrganization />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/case/:caseId" element={<CaseDetail />} />
          </Routes>
        </AppShell>
      </AuthGate>
    </BrowserRouter>
  )
}

export default App

import React, { useEffect, useState } from 'react'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserdata } from './redux/userSlice'
import Landing from './pages/Landing'
import PatientPortal from './pages/PatientPortal'
import DoctorDashboard from './pages/DoctorDashboard'
import AuthGate from './components/AuthGate'

function App() {
  const dispatch = useDispatch()
  const [view, setView] = useState('landing') // 'landing' | 'patient' | 'doctor'

  useEffect(() => {
    const getUser = async () => {
      const data = await getCurrentUser()
      dispatch(setUserdata(data))
    }
    getUser()
  }, [])

  if (view === 'patient') {
    return (
      <AuthGate>
        <PatientPortal onBack={() => setView('landing')} />
      </AuthGate>
    )
  }

  if (view === 'doctor') {
    return (
      <AuthGate>
        <DoctorDashboard onBack={() => setView('landing')} />
      </AuthGate>
    )
  }

  return (
    <Landing
      onPatientPortal={() => setView('patient')}
      onDoctorDashboard={() => setView('doctor')}
    />
  )
}

export default App

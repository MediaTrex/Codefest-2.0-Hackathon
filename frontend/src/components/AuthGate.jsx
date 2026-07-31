import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { LogIn, Loader2 } from 'lucide-react'
import { loginWithGoogle } from '../features/login'
import { setUserdata } from '../redux/userSlice'
import CarePilotLogo from './CarePilotLogo'

function AuthGate({ children }) {
  const userData = useSelector((state) => state.user.userData)
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const user = await loginWithGoogle()
      dispatch(setUserdata(user))
    } catch (err) {
      console.log(err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Sign-in failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (userData) return children

  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center gap-5 px-6"
      style={{
        background: 'var(--cf-bg)',
        fontFamily: 'var(--cf-font-ui)',
      }}
    >
      <CarePilotLogo size={56} className="rounded-xl shadow-sm" />
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cf-ink)] m-0">
          CarePilot Ai
        </h1>
        <p className="text-[14px] text-[var(--cf-ink-faint)] mt-2 mb-0">
          Sign in to continue to the hospital command center
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-lg text-white text-[14px] font-medium border-none cursor-pointer transition-opacity duration-150 disabled:opacity-60 min-h-[44px] bg-[var(--cf-ink)] hover:opacity-90"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        Sign in with Google
      </button>
      {error && (
        <p className="text-[13px] text-[var(--cf-ink-soft)] max-w-sm text-center m-0">
          {error}
        </p>
      )}
    </div>
  )
}

export default AuthGate

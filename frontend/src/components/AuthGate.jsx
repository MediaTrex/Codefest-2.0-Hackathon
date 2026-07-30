import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { LogIn, HeartPulse, Loader2 } from 'lucide-react'
import { loginWithGoogle } from '../features/login'
import { setUserdata } from '../redux/userSlice'

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
      style={{ background: '#F7F9FC' }}
    >
      <div
        className="w-14 h-14 rounded-[18px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #5B5CEB 0%, #818cf8 100%)',
          boxShadow: '0 12px 32px rgba(91,92,235,0.28)',
        }}
      >
        <HeartPulse size={24} className="text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
          CareFlow AI
        </h1>
        <p className="text-[14px] text-slate-500 mt-2">
          Sign in to continue to the hospital command center
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[14px] font-medium border-none cursor-pointer transition-all duration-150 disabled:opacity-60 min-h-[44px]"
        style={{ background: '#5B5CEB', boxShadow: '0 8px 24px rgba(91,92,235,0.25)' }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        Sign in with Google
      </button>
      {error && <p className="text-[13px] text-[#EF4444] max-w-sm text-center">{error}</p>}
    </div>
  )
}

export default AuthGate

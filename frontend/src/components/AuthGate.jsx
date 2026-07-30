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
            setError('Sign-in failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (userData) return children

    return (
        <div className='h-screen w-full flex flex-col items-center justify-center bg-[#0d0f14] text-white gap-4'>
            <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20'>
                <HeartPulse size={18} className='text-indigo-400' />
            </div>
            <p className='text-[14px] text-slate-300'>Sign in to continue to CareFlow AI</p>
            <button onClick={handleLogin} disabled={loading}
                className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white text-[13.5px] font-medium border-none cursor-pointer transition-colors duration-150'>
                {loading ? <Loader2 size={15} className='animate-spin' /> : <LogIn size={15} />}
                Sign in with Google
            </button>
            {error && <p className='text-[12px] text-red-400'>{error}</p>}
        </div>
    )
}

export default AuthGate

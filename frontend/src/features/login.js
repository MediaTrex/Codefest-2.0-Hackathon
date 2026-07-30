import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'

export const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    const token = await result.user.getIdToken()
    const { data } = await api.post('/api/auth/login', { token })
    return data
}

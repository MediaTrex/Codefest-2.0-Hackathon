import api from '../../utils/axios'

async function logOut() {
  try {
    await api.get('/api/auth/logout')
  } catch (error) {
    console.log(error)
  }
}

export default logOut

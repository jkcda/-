import axios from 'axios'

const http = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || '',
    timeout: 5000,
})
//请求拦截器
http.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

//响应拦截器
http.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        return Promise.reject(error)
    }
)
export default http
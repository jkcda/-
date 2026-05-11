import request from '../utils/http'

export const getRooms = () => request.get('/rooms')
export const createRoom = (data: { name: string; topic?: string; agentIds: number[] }) =>
  request.post('/rooms', data)
export const getRoomDetail = (id: number) => request.get(`/rooms/${id}`)
export const updateRoom = (id: number, data: { name?: string; topic?: string }) =>
  request.put(`/rooms/${id}`, data)
export const deleteRoom = (id: number) => request.delete(`/rooms/${id}`)
export const addAgentToRoom = (roomId: number, agentId: number) =>
  request.post(`/rooms/${roomId}/agents`, { agentId })
export const removeAgentFromRoom = (roomId: number, agentId: number) =>
  request.delete(`/rooms/${roomId}/agents/${agentId}`)
export const getRoomHistory = (id: number) => request.get(`/rooms/${id}/history`)
export const joinRoom = (id: number) => request.post(`/rooms/${id}/join`)
export const discoverRooms = () => request.get('/rooms/discover/list')

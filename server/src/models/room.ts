import pool from '../utils/db.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface ChatRoom {
  id: number
  owner_id: number
  name: string
  topic: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface RoomAgent {
  agent_id: number
  name: string
  avatar: string | null
  system_prompt: string
  greeting: string | null
}

export const RoomModel = {
  async create(ownerId: number, name: string, agentIds: number[], topic?: string): Promise<number> {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const [roomResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO chat_rooms (owner_id, name, topic) VALUES (?, ?, ?)',
        [ownerId, name, topic || null]
      )
      const roomId = roomResult.insertId

      if (agentIds.length > 0) {
        const values = agentIds.map(agentId => [roomId, agentId])
        await conn.query('INSERT INTO chat_room_agents (room_id, agent_id) VALUES ?', [values])
      }

      // 创建者自动加入房间
      await conn.execute(
        'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
        [roomId, ownerId]
      )

      await conn.commit()
      return roomId
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async findById(id: number): Promise<ChatRoom | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_rooms WHERE id = ?', [id]
    )
    return rows[0] as ChatRoom | null
  },

  async findByUserId(userId: number): Promise<ChatRoom[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT cr.*, COUNT(crm2.user_id) AS member_count
       FROM chat_rooms cr
       INNER JOIN chat_room_members crm ON cr.id = crm.room_id AND crm.user_id = ?
       LEFT JOIN chat_room_members crm2 ON cr.id = crm2.room_id
       GROUP BY cr.id
       ORDER BY cr.updated_at DESC`,
      [userId]
    )
    return rows as ChatRoom[]
  },

  async update(id: number, data: { name?: string; topic?: string | null }): Promise<void> {
    const sets: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
    if (data.topic !== undefined) { sets.push('topic = ?'); values.push(data.topic) }
    if (sets.length === 0) return
    values.push(id)
    await pool.execute(`UPDATE chat_rooms SET ${sets.join(', ')} WHERE id = ?`, values)
  },

  async delete(id: number): Promise<void> {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute('DELETE FROM chat_history WHERE room_id = ?', [id])
      await conn.execute('DELETE FROM chat_rooms WHERE id = ?', [id])
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async isOwner(roomId: number, userId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM chat_rooms WHERE id = ? AND owner_id = ?', [roomId, userId]
    )
    return rows.length > 0
  },

  // ── 角色管理 ──

  async addAgent(roomId: number, agentId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO chat_room_agents (room_id, agent_id) VALUES (?, ?)',
      [roomId, agentId]
    )
  },

  async removeAgent(roomId: number, agentId: number): Promise<void> {
    await pool.execute(
      'DELETE FROM chat_room_agents WHERE room_id = ? AND agent_id = ?',
      [roomId, agentId]
    )
  },

  async getAgents(roomId: number): Promise<RoomAgent[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.id AS agent_id, a.name, a.avatar, a.system_prompt, a.greeting
       FROM chat_room_agents cra
       INNER JOIN ai_agents a ON a.id = cra.agent_id
       WHERE cra.room_id = ?
       ORDER BY cra.joined_at ASC`,
      [roomId]
    )
    return rows as RoomAgent[]
  },

  async getAgentIds(roomId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT agent_id FROM chat_room_agents WHERE room_id = ?', [roomId]
    )
    return rows.map(r => r.agent_id)
  },

  // ── 成员管理 ──

  async addMember(roomId: number, userId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
      [roomId, userId]
    )
  },

  async getMembers(roomId: number): Promise<number[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id FROM chat_room_members WHERE room_id = ?', [roomId]
    )
    return rows.map(r => r.user_id)
  },

  async isMember(roomId: number, userId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    )
    return rows.length > 0
  },
}

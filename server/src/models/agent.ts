import pool from '../utils/db.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface AiAgent {
  id: number
  user_id: number
  name: string
  avatar: string | null
  system_prompt: string
  greeting: string | null
  model_config: string | null
  is_default: boolean
  created_at: Date
  updated_at: Date
}

export const AgentModel = {
  async create(userId: number, name: string, systemPrompt: string, greeting?: string, avatar?: string) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO ai_agents (user_id, name, system_prompt, greeting, avatar) VALUES (?, ?, ?, ?, ?)',
      [userId, name, systemPrompt, greeting || null, avatar || null]
    )
    return result.insertId
  },

  async findById(id: number): Promise<AiAgent | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM ai_agents WHERE id = ?', [id]
    )
    return rows[0] as AiAgent | null
  },

  async findByUserId(userId: number): Promise<AiAgent[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM ai_agents WHERE user_id = ? ORDER BY created_at DESC', [userId]
    )
    return rows as AiAgent[]
  },

  async update(id: number, data: { name?: string; systemPrompt?: string; greeting?: string; avatar?: string | null }) {
    const sets: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
    if (data.systemPrompt !== undefined) { sets.push('system_prompt = ?'); values.push(data.systemPrompt) }
    if (data.greeting !== undefined) { sets.push('greeting = ?'); values.push(data.greeting) }
    if (data.avatar !== undefined) { sets.push('avatar = ?'); values.push(data.avatar) }
    if (sets.length === 0) return
    values.push(id)
    await pool.execute(`UPDATE ai_agents SET ${sets.join(', ')} WHERE id = ?`, values)
  },

  async updateOwner(id: number, userId: number) {
    // Verify ownership before update/delete
    const agent = await AgentModel.findById(id)
    return agent && agent.user_id === userId
  },

  async delete(id: number) {
    await pool.execute('DELETE FROM ai_agents WHERE id = ?', [id])
  }
}

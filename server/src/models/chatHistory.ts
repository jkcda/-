import  pool  from '../utils/db.js'

interface ChatHistory {
  id: number
  session_id: string
  user_id: number | null
  role: 'user' | 'assistant'
  content: string
  created_at: Date
}

export class ChatHistoryModel {
  // 保存对话历史
  static async create(sessionId: string, userId: number | null, role: 'user' | 'assistant', content: string) {
    const [result] = await pool.execute(
      'INSERT INTO chat_history (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
      [sessionId, userId, role, content]
    )
    return (result as any).insertId
  }

  // 获取对话历史
  static async getBySessionId(sessionId: string) {
    const [rows] = await pool.execute(
      'SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    )
    return rows as ChatHistory[]
  }

  // 清理对话历史（可选）
  static async deleteBySessionId(sessionId: string) {
    const [result] = await pool.execute(
      'DELETE FROM chat_history WHERE session_id = ?',
      [sessionId]
    )
    return (result as any).affectedRows
  }
}

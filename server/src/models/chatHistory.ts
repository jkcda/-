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

  // 获取对话历史 - 同时匹配 session_id 和 user_id
  static async getBySessionIdAndUserId(sessionId: string, userId: number | null) {
    let query = 'SELECT * FROM chat_history WHERE session_id = ?'
    let params: any[] = [sessionId]
    
    // 如果有用户 ID，则同时匹配 user_id
    if (userId !== null) {
      query += ' AND user_id = ?'
      params.push(userId)
    }
    
    query += ' ORDER BY created_at ASC'
    
    const [rows] = await pool.execute(query, params)
    return rows as ChatHistory[]
  }

  // 根据 session_id 删除对话历史
  static async deleteBySessionId(sessionId: string) {
    const [result] = await pool.execute(
      'DELETE FROM chat_history WHERE session_id = ?',
      [sessionId]
    )
    return (result as any).affectedRows
  }

  // 根据 user_id 删除该用户的所有对话历史
  static async deleteByUserId(userId: number) {
    const [result] = await pool.execute(
      'DELETE FROM chat_history WHERE user_id = ?',
      [userId]
    )
    return (result as any).affectedRows
  }

  // 根据 session_id 和 user_id 删除对话历史
  static async deleteBySessionIdAndUserId(sessionId: string, userId: number) {
    const [result] = await pool.execute(
      'DELETE FROM chat_history WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    )
    return (result as any).affectedRows
  }
}

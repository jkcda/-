import  pool  from '../utils/db.js'

interface ChatHistory {
  id: number
  session_id: string
  user_id: number | null
  role: 'user' | 'assistant'
  content: string
  files?: string | null
  created_at: Date
}

export class ChatHistoryModel {
  // 保存对话历史
  static async create(
    sessionId: string,
    userId: number | null,
    role: 'user' | 'assistant',
    content: string,
    files?: string,
    kbId?: number,
    retrievedChunks?: string
  ) {
    const [result] = await pool.execute(
      'INSERT INTO chat_history (session_id, user_id, role, content, files, kb_id, retrieved_chunks) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, userId, role, content, files || null, kbId || null, retrievedChunks || null]
    )
    return (result as any).insertId
  }

  // 获取对话历史 - 同时匹配 session_id 和 user_id
  static async getBySessionIdAndUserId(sessionId: string, userId: number | null) {
    let query = 'SELECT * FROM chat_history WHERE session_id = ?'
    let params: any[] = [sessionId]

    if (userId !== null) {
      // 匹配该用户的会话 + 历史遗留的匿名会话
      query += ' AND (user_id = ? OR user_id IS NULL)'
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

  // 获取所有用户的对话统计信息（管理员用）
  static async getUserChatStats() {
    const [rows] = await pool.execute(`
      SELECT
        u.id AS user_id,
        u.username,
        u.email,
        COUNT(DISTINCT ch.session_id) AS session_count,
        COUNT(ch.id) AS message_count,
        SUM(CASE WHEN ch.role = 'user' THEN 1 ELSE 0 END) AS user_message_count,
        SUM(CASE WHEN ch.role = 'assistant' THEN 1 ELSE 0 END) AS assistant_message_count,
        MAX(ch.created_at) AS last_active_at
      FROM users u
      LEFT JOIN chat_history ch ON u.id = ch.user_id
      GROUP BY u.id, u.username, u.email
      ORDER BY last_active_at DESC
    `)
    return rows
  }

  // 根据用户ID获取对话历史（管理员用）
  static async getByUserId(userId: number) {
    const [rows] = await pool.execute(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    )
    return rows as ChatHistory[]
  }

  // 获取用户的所有会话列表（含预览信息）
  static async getSessionsByUserId(userId: number | null) {
    if (userId !== null) {
      // 查询该用户的会话 + 历史遗留的匿名会话（user_id IS NULL）
      const [rows] = await pool.execute(`
        SELECT
          ch.session_id,
          MIN(ch.created_at) AS created_at,
          MAX(ch.created_at) AS last_active_at,
          COUNT(*) AS message_count,
          (SELECT c2.content FROM chat_history c2
           WHERE c2.session_id = ch.session_id AND c2.role = 'user'
           ORDER BY c2.created_at ASC LIMIT 1) AS first_message
        FROM chat_history ch
        WHERE ch.user_id = ? OR ch.user_id IS NULL
        GROUP BY ch.session_id
        ORDER BY last_active_at DESC
      `, [userId])
      return rows
    } else {
      // 未登录用户：返回匿名会话
      const [rows] = await pool.execute(`
        SELECT
          ch.session_id,
          MIN(ch.created_at) AS created_at,
          MAX(ch.created_at) AS last_active_at,
          COUNT(*) AS message_count,
          (SELECT c2.content FROM chat_history c2
           WHERE c2.session_id = ch.session_id AND c2.role = 'user'
           ORDER BY c2.created_at ASC LIMIT 1) AS first_message
        FROM chat_history ch
        WHERE ch.user_id IS NULL
        GROUP BY ch.session_id
        ORDER BY last_active_at DESC
      `)
      return rows
    }
  }
}

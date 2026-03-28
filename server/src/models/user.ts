import pool from '../utils/db.js'

export interface User {
  id?: number
  username: string
  email: string
  password: string
  role?: 'admin' | 'user'
  created_at?: Date
}

export class UserModel {
  // 创建用户
  static async create(user: Omit<User, 'id' | 'created_at'>): Promise<number> {
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [user.username, user.email, user.password, user.role || 'user']
    )
    return (result as any).insertId
  }

  // 根据用户名查找用户
  static async findByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )
    return (rows as User[])[0] || null
  }

  // 根据邮箱查找用户
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )
    return (rows as User[])[0] || null
  }

  // 根据 ID 查找用户
  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    return (rows as User[])[0] || null
  }
}

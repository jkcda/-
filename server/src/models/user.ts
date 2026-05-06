import pool from '../utils/db.js'

export interface User {
  id?: number
  username: string
  email: string
  password: string
  role?: 'admin' | 'user'
  email_verified?: number
  created_at?: Date
}

export class UserModel {
  // 创建已验证用户（邮箱验证通过后调用）
  static async createVerified(user: { username: string; email: string; password: string; role?: string }): Promise<number> {
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)',
      [user.username, user.email, user.password, user.role || 'user']
    )
    return (result as any).insertId
  }

  // 管理员直接创建用户（跳过验证）
  static async create(user: { username: string; email: string; password: string; role?: string }): Promise<number> {
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)',
      [user.username, user.email, user.password, user.role || 'user']
    )
    return (result as any).insertId
  }

  static async findByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
    return (rows as User[])[0] || null
  }

  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email])
    return (rows as User[])[0] || null
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
    return (rows as User[])[0] || null
  }
}

import pool from '../utils/db.js'
import crypto from 'crypto'

export interface User {
  id?: number
  username: string
  email: string
  password: string
  role?: 'admin' | 'user'
  email_verified?: number
  verification_token?: string
  created_at?: Date
}

// 确保表有验证字段（首次运行时自动 ALTER TABLE）
let migrationDone = false
async function ensureEmailColumns() {
  if (migrationDone) return
  try {
    await pool.execute("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0")
  } catch {}
  try {
    await pool.execute("ALTER TABLE users ADD COLUMN verification_token VARCHAR(100) NULL")
  } catch {}
  migrationDone = true
}

export class UserModel {
  // 创建用户（含验证令牌）
  static async create(user: Omit<User, 'id' | 'created_at' | 'email_verified' | 'verification_token'>): Promise<{ id: number; token: string }> {
    await ensureEmailColumns()
    const token = crypto.randomUUID()
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role, email_verified, verification_token) VALUES (?, ?, ?, ?, 0, ?)',
      [user.username, user.email, user.password, user.role || 'user', token]
    )
    return { id: (result as any).insertId, token }
  }

  // 验证邮箱
  static async verifyEmail(token: string): Promise<boolean> {
    await ensureEmailColumns()
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE verification_token = ? AND email_verified = 0',
      [token]
    )
    const user = (rows as any[])[0]
    if (!user) return false
    await pool.execute(
      'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    )
    return true
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

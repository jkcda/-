import pool from '../utils/db.js'

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS verification_codes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(100) NOT NULL,
      code VARCHAR(10) NOT NULL,
      username VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vc_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  } catch {}
  tableReady = true
}

export class VerificationModel {
  // 保存待验证的注册信息，返回验证码
  static async create(data: { email: string; username: string; password: string }): Promise<string> {
    await ensureTable()
    const code = String(Math.floor(100000 + Math.random() * 900000))
    // 删除同邮箱旧验证码
    await pool.execute('DELETE FROM verification_codes WHERE email = ?', [data.email])
    await pool.execute(
      'INSERT INTO verification_codes (email, code, username, password) VALUES (?, ?, ?, ?)',
      [data.email, code, data.username, data.password]
    )
    return code
  }

  // 验证验证码，返回待注册的用户信息（或 null）
  static async verify(email: string, code: string): Promise<{ username: string; password: string } | null> {
    await ensureTable()
    const [rows] = await pool.execute(
      `SELECT username, password FROM verification_codes
       WHERE email = ? AND code = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [email, code]
    ) as [Array<{ username: string; password: string }>, any]
    if (!rows.length) return null
    // 验证通过后删除临时记录
    await pool.execute('DELETE FROM verification_codes WHERE email = ?', [email])
    return { username: rows[0]!.username, password: rows[0]!.password }
  }
}

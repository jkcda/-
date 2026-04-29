import pool from '../utils/db.js'

export interface KbDocument {
  id: number
  kb_id: number
  filename: string
  file_path: string
  file_type: string
  file_size: number
  chunk_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: Date
}

export class KbDocumentModel {
  static async create(kbId: number, filename: string, filePath: string, fileType: string, fileSize: number): Promise<number> {
    const [result] = await pool.execute(
      'INSERT INTO kb_documents (kb_id, filename, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
      [kbId, filename, filePath, fileType, fileSize]
    )
    return (result as any).insertId
  }

  static async findByKbId(kbId: number): Promise<KbDocument[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM kb_documents WHERE kb_id = ? ORDER BY created_at DESC',
      [kbId]
    )
    return rows as KbDocument[]
  }

  static async findById(id: number): Promise<KbDocument | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM kb_documents WHERE id = ?',
      [id]
    )
    return (rows as KbDocument[])[0] || null
  }

  static async updateStatus(id: number, status: string, chunkCount?: number, errorMessage?: string): Promise<void> {
    const fields: string[] = ['status = ?']
    const params: any[] = [status]

    if (chunkCount !== undefined) {
      fields.push('chunk_count = ?')
      params.push(chunkCount)
    }
    if (errorMessage !== undefined) {
      fields.push('error_message = ?')
      params.push(errorMessage)
    }

    params.push(id)
    await pool.execute(`UPDATE kb_documents SET ${fields.join(', ')} WHERE id = ?`, params)
  }

  static async delete(id: number): Promise<{ kbId: number; chunkCount: number } | null> {
    const doc = await this.findById(id)
    if (!doc) return null

    await pool.execute('DELETE FROM kb_documents WHERE id = ?', [id])
    return { kbId: doc.kb_id, chunkCount: doc.chunk_count }
  }
}

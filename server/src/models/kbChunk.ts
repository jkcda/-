import pool from '../utils/db.js'

export interface KbChunk {
  id: number
  doc_id: number
  kb_id: number
  chunk_index: number
  content_preview: string | null
  created_at: Date
}

export class KbChunkModel {
  static async batchCreate(docId: number, kbId: number, chunks: { chunkIndex: number; contentPreview: string }[]): Promise<void> {
    if (chunks.length === 0) return

    const values = chunks.map(() => '(?, ?, ?, ?)').join(', ')
    const params: any[] = []
    for (const c of chunks) {
      params.push(docId, kbId, c.chunkIndex, c.contentPreview)
    }

    await pool.execute(
      `INSERT INTO kb_chunks (doc_id, kb_id, chunk_index, content_preview) VALUES ${values}`,
      params
    )
  }

  static async findByDocId(docId: number): Promise<KbChunk[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM kb_chunks WHERE doc_id = ? ORDER BY chunk_index ASC',
      [docId]
    )
    return rows as KbChunk[]
  }

  static async deleteByDocId(docId: number): Promise<number> {
    const [result] = await pool.execute(
      'DELETE FROM kb_chunks WHERE doc_id = ?',
      [docId]
    )
    return (result as any).affectedRows
  }
}

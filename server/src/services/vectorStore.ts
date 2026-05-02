import { LanceDB } from '@langchain/community/vectorstores/lancedb'
import { Document } from '@langchain/core/documents'
import { getEmbeddings } from './embedding.js'
import config from '../config/index.js'
import { connect } from '@lancedb/lancedb'
import path from 'path'
import fs from 'fs'
import type { Connection, Table } from '@lancedb/lancedb'

let _connection: Connection | null = null

async function getConnection(): Promise<Connection> {
  if (!_connection) {
    const dataDir = path.resolve(config.lancedb.dataDir)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    _connection = await connect(dataDir)
  }
  return _connection
}

export async function getVectorStore(tableName: string): Promise<LanceDB> {
  const embeddings = getEmbeddings()
  const conn = await getConnection()
  const tableNames = await conn.tableNames()

  if (tableNames.includes(tableName)) {
    const table = await conn.openTable(tableName)
    return new LanceDB(embeddings, { table })
  }

  // 创建空表
  const table = await conn.createTable(tableName, [
    { vector: Array(config.rag.chunkSize > 0 ? 1024 : 1).fill(0), text: '', doc_id: 0, kb_id: 0, filename: '', chunk_index: 0 }
  ])
  // 删除初始占位行
  await table.delete('doc_id = 0')
  return new LanceDB(embeddings, { table })
}

export async function createVectorStore(tableName: string): Promise<LanceDB> {
  return getVectorStore(tableName)
}

export async function addDocuments(
  tableName: string,
  docs: Document[]
): Promise<void> {
  const store = await getVectorStore(tableName)
  await store.addDocuments(docs)
}

export async function similaritySearch(
  tableName: string,
  query: string,
  k: number = config.rag.topK
): Promise<[Document, number][]> {
  const store = await getVectorStore(tableName)
  return store.similaritySearchWithScore(query, k)
}

export async function deleteVectorStore(tableName: string): Promise<void> {
  const conn = await getConnection()
  const tableNames = await conn.tableNames()
  if (tableNames.includes(tableName)) {
    await conn.dropTable(tableName)
  }
}

export async function getAdjacentChunks(
  tableName: string,
  docId: number,
  centerChunkIndex: number,
  before: number,
  after: number
): Promise<{ text: string; chunkIndex: number }[]> {
  const conn = await getConnection()
  const tableNames = await conn.tableNames()
  if (!tableNames.includes(tableName)) return []

  const table = await conn.openTable(tableName)
  const minIdx = Math.max(0, centerChunkIndex - before)
  const maxIdx = centerChunkIndex + after

  const results = await table
    .query()
    .where(`doc_id = ${docId} AND chunk_index >= ${minIdx} AND chunk_index <= ${maxIdx}`)
    .toArray()

  return (results as any[])
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map(r => ({ text: r.text as string, chunkIndex: r.chunk_index as number }))
}

export async function deleteDocumentsByDocId(
  tableName: string,
  docId: number
): Promise<void> {
  const conn = await getConnection()
  const tableNames = await conn.tableNames()
  if (!tableNames.includes(tableName)) return

  const table = await conn.openTable(tableName)
  await table.delete(`doc_id = ${docId}`)
}

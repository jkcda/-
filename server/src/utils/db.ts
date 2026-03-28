// 配置mysql连接
import mysql from 'mysql2/promise'
import config from '../config/index.js'

// 创建连接池
const pool = mysql.createPool({
    host: config.database.host,
    port: Number(process.env.DB_PORT) || 3306,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
})

// 测试连接池
async function testConnection(){
    try{
        const connection = await pool.getConnection()
        console.log('数据库连接成功')
        connection.release()
    }catch(err){
        console.error('数据库连接失败', err)
    }
}

testConnection()
export default pool

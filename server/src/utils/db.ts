//配置mysql连接
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
/// 配置环境变量
dotenv.config() 

//创建连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})
//测试连接池
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

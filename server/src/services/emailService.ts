import nodemailer from 'nodemailer'
import config from '../config/index.js'

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
})

export async function sendVerificationEmail(to: string, token: string) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173'
  const verifyUrl = `${base}/verify?token=${token}xi`

  await transporter.sendMail({
    from: `"奈克瑟 NEXUS" <${config.email.from}>`,
    to,
    subject: '验证您的邮箱 — 奈克瑟 NEXUS',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:sans-serif;background:#0a0a1e;color:#e0e0e0;border-radius:12px;border:1px solid rgba(212,175,55,0.2)">
        <h2 style="color:#d4af37;margin-bottom:8px">✦ 奈克瑟 NEXUS</h2>
        <p style="font-size:14px;color:#a0a0b0">感谢注册！请点击下方按钮验证您的邮箱地址。</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;padding:12px 32px;background:linear-gradient(135deg,#d4af37,#b8960f);color:#0a0a1e;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">验证邮箱</a>
        <p style="font-size:12px;color:#606070;margin-top:16px">如果按钮无法点击，请复制以下链接到浏览器：<br/><span style="color:#d4af37">${verifyUrl}</span></p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0"/>
        <p style="font-size:11px;color:#404050">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `,
  })
}

import nodemailer from 'nodemailer'
import config, { getSetting } from '../config/index.js'

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: getSetting('EMAIL_USER'),
    pass: getSetting('EMAIL_PASS'),
  },
})

export async function sendVerificationEmail(to: string, code: string) {
  await transporter.sendMail({
    from: `"奈克瑟 NEXUS" <${process.env.EMAIL_FROM || getSetting('EMAIL_USER')}>`,
    to,
    subject: '邮箱验证码 — 奈克瑟 NEXUS',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:sans-serif;background:#0a0a1e;color:#e0e0e0;border-radius:12px;border:1px solid rgba(212,175,55,0.2)">
        <h2 style="color:#d4af37;margin-bottom:8px">✦ 奈克瑟 NEXUS</h2>
        <p style="font-size:14px;color:#a0a0b0">感谢注册！您的邮箱验证码为：</p>
        <div style="margin:24px 0;padding:20px;background:rgba(212,175,55,0.1);border-radius:8px;text-align:center">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#d4af37;font-family:'Courier New',monospace">${code}</span>
        </div>
        <p style="font-size:12px;color:#606070">请在注册页面输入此验证码完成验证，10分钟内有效。</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0"/>
        <p style="font-size:11px;color:#404050">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `,
  })
}

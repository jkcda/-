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
    subject: `验证码 ${code} — 奈克瑟 NEXUS`,
    html: `<div style="text-align:center;padding:24px;font-family:Arial,sans-serif;">
      <h2 style="color:#333;">奈克瑟 NEXUS 邮箱验证</h2>
      <p style="color:#666;font-size:14px;">您的验证码是：</p>
      <div style="margin:20px auto;padding:16px 24px;background:#f5f5f5;border-radius:8px;display:inline-block;">
        <span style="font-size:42px;font-weight:700;letter-spacing:14px;color:#333;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#999;font-size:13px;margin-top:20px;">请在注册页面输入此验证码，5分钟内有效。</p>
      <p style="color:#bbb;font-size:12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>`,
  })
}

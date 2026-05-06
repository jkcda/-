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
    html: `<div style="text-align:center;padding:20px;font-family:Arial,sans-serif;">
      <h2>奈克瑟 NEXUS 邮箱验证</h2>
      <p>您的验证码是：</p>
      <h1 style="font-size:48px;color:#d4af37;">${code}</h1>
      <p style="color:#888;font-size:13px;">请在5分钟内于注册页面输入此验证码</p>
    </div>`,
  })
}

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
  const html = `<div style="text-align:center;padding:20px;font-family:Arial,sans-serif;">
    <h2>奈克瑟 NEXUS</h2>
    <p>您的邮箱验证码是：</p>
    <h1 style="font-size:52px;letter-spacing:8px;color:#d4af37;margin:16px 0;">${code}</h1>
    <p style="color:#888;">请在5分钟内于注册页面输入此验证码</p>
  </div>`
  console.log(`[Email] 发送验证码到 ${to}: ${code}`)
  await transporter.sendMail({
    from: `"奈克瑟 NEXUS" <${process.env.EMAIL_FROM || getSetting('EMAIL_USER')}>`,
    to,
    subject: '奈克瑟 NEXUS 邮箱验证码',
    text: `您的验证码是：${code}。请在5分钟内于注册页面输入。`,
    html,
  })
}

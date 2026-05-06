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
  console.log(`[Email] 发送验证码到 ${to}: ${code}`)
  await transporter.sendMail({
    from: `"奈克瑟 NEXUS" <${process.env.EMAIL_FROM || getSetting('EMAIL_USER')}>`,
    to,
    subject: '奈克瑟 NEXUS 邮箱验证码',
    text: `您的验证码是：${code}。请在5分钟内于注册页面输入。`,
    html: `<p>您的验证码是：<b>${code}</b></p><p>请在5分钟内于注册页面输入。</p>`,
  })
}

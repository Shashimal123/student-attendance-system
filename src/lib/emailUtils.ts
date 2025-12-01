import nodemailer from 'nodemailer'
import { logger } from './logger'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

// Email configuration
const getEmailConfig = (): EmailConfig => {
  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  }
}

// Create transporter
const createTransporter = () => {
  const config = getEmailConfig()
  return nodemailer.createTransporter(config)
}

// Send email
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  const emailLogger = logger.withContext('EmailService')
  
  try {
    emailLogger.info('Sending email', { 
      to: emailData.to, 
      subject: emailData.subject 
    })
    
    const transporter = createTransporter()
    
    await transporter.sendMail({
      from: `"Student Attendance System" <${process.env.EMAIL_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    })

    emailLogger.info('Email sent successfully', { to: emailData.to })
    return true
  } catch (error) {
    emailLogger.error('Failed to send email', error, { 
      to: emailData.to,
      subject: emailData.subject 
    })
    return false
  }
}

// Email templates
export const emailTemplates = {
  welcomeStudent: (studentName: string, studentId: string) => ({
    subject: 'Welcome to Student Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Student Attendance System</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${studentName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Welcome to our Student Attendance System! Your account has been successfully created.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Your Student Information:</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Student ID:</strong> ${studentId}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${studentName}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You can now:
          </p>
          
          <ul style="color: #666; line-height: 1.8;">
            <li>View and download your unique QR code for attendance</li>
            <li>Enroll in available courses</li>
            <li>Track your attendance records</li>
            <li>View your payment status</li>
            <li>Receive important notifications</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact your administrator.
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to Student Attendance System!
      
      Hello ${studentName}!
      
      Your account has been successfully created.
      
      Student ID: ${studentId}
      Name: ${studentName}
      
      You can now:
      - View and download your unique QR code for attendance
      - Enroll in available courses
      - Track your attendance records
      - View your payment status
      - Receive important notifications
      
      Login at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login
      
      If you have any questions, please contact your administrator.
    `
  }),

  attendanceMarked: (studentName: string, courseName: string, status: string, date: string) => ({
    subject: 'Attendance Marked - Student Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Attendance Update</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${studentName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Your attendance has been marked for the following class:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Attendance Details:</h3>
            <p style="margin: 8px 0; color: #666;"><strong>Course:</strong> ${courseName}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Status:</strong> 
              <span style="color: ${status === 'PRESENT' ? '#28a745' : status === 'LATE' ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                ${status}
              </span>
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You can view your complete attendance record by logging into your account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/student/attendance" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Attendance Records
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This is an automated notification from the Student Attendance System.
          </p>
        </div>
      </div>
    `,
    text: `
      Attendance Update
      
      Hello ${studentName}!
      
      Your attendance has been marked for the following class:
      
      Course: ${courseName}
      Date: ${date}
      Status: ${status}
      
      You can view your complete attendance record by logging into your account.
      
      View attendance at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/student/attendance
      
      This is an automated notification from the Student Attendance System.
    `
  }),

  paymentReminder: (studentName: string, amount: number, month: number, year: number, daysOverdue: number) => ({
    subject: 'Payment Reminder - Student Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${studentName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder about your outstanding payment.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Payment Details:</h3>
            <p style="margin: 8px 0; color: #666;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Period:</strong> ${month}/${year}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-weight: bold;">
              ⚠️ Important: Students with payments overdue for more than 3 months may be removed from the system.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Please make your payment as soon as possible to avoid any disruption to your studies.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/student/payments" 
               style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Payment Details
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you have already made this payment, please contact your administrator to update your records.
          </p>
        </div>
      </div>
    `,
    text: `
      Payment Reminder
      
      Hello ${studentName}!
      
      This is a friendly reminder about your outstanding payment.
      
      Amount: $${amount.toFixed(2)}
      Period: ${month}/${year}
      Days Overdue: ${daysOverdue}
      
      Important: Students with payments overdue for more than 3 months may be removed from the system.
      
      Please make your payment as soon as possible to avoid any disruption to your studies.
      
      View payment details at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/student/payments
      
      If you have already made this payment, please contact your administrator to update your records.
    `
  })
}

// Send welcome email to student
export async function sendWelcomeEmail(studentEmail: string, studentName: string, studentId: string): Promise<boolean> {
  const template = emailTemplates.welcomeStudent(studentName, studentId)
  
  return await sendEmail({
    to: studentEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  })
}

// Send attendance notification email
export async function sendAttendanceEmail(studentEmail: string, studentName: string, courseName: string, status: string): Promise<boolean> {
  const template = emailTemplates.attendanceMarked(
    studentName, 
    courseName, 
    status, 
    new Date().toLocaleDateString()
  )
  
  return await sendEmail({
    to: studentEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  })
}

// Send payment reminder email
export async function sendPaymentReminderEmail(
  studentEmail: string, 
  studentName: string, 
  amount: number, 
  month: number, 
  year: number, 
  daysOverdue: number
): Promise<boolean> {
  const template = emailTemplates.paymentReminder(studentName, amount, month, year, daysOverdue)
  
  return await sendEmail({
    to: studentEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  })
}

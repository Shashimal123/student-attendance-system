import { prisma } from './prisma'

export interface NotificationData {
  studentId: string
  title: string
  message: string
  type: 'payment' | 'attendance' | 'general'
}

export async function createNotification(data: NotificationData) {
  return await prisma.notification.create({
    data: {
      studentId: data.studentId,
      title: data.title,
      message: data.message,
      type: data.type
    }
  })
}

export async function createPaymentNotification(studentId: string, message: string) {
  return await createNotification({
    studentId,
    title: 'Payment Reminder',
    message,
    type: 'payment'
  })
}

export async function createAttendanceNotification(studentId: string, message: string) {
  return await createNotification({
    studentId,
    title: 'Attendance Update',
    message,
    type: 'attendance'
  })
}

export async function createGeneralNotification(studentId: string, title: string, message: string) {
  return await createNotification({
    studentId,
    title,
    message,
    type: 'general'
  })
}

export async function getStudentNotifications(studentId: string, limit: number = 10) {
  return await prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

export async function markNotificationAsRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  })
}

export async function markAllNotificationsAsRead(studentId: string) {
  return await prisma.notification.updateMany({
    where: { 
      studentId,
      isRead: false 
    },
    data: { isRead: true }
  })
}

export async function getUnreadNotificationCount(studentId: string) {
  return await prisma.notification.count({
    where: {
      studentId,
      isRead: false
    }
  })
}

// Auto-notification functions
export async function checkAndCreatePaymentNotifications() {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Find students with pending payments
  const studentsWithPendingPayments = await prisma.student.findMany({
    where: {
      isActive: true,
      payments: {
        some: {
          status: 'PENDING',
          month: currentMonth,
          year: currentYear
        }
      }
    },
    include: {
      payments: {
        where: {
          month: currentMonth,
          year: currentYear,
          status: 'PENDING'
        }
      }
    }
  })

  for (const student of studentsWithPendingPayments) {
    const payment = student.payments[0]
    const daysPastDue = Math.floor((currentDate.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysPastDue > 0 && daysPastDue <= 14) {
      await createPaymentNotification(
        student.id,
        `Your payment of $${payment.amount} for ${currentMonth}/${currentYear} is ${daysPastDue} days overdue. Please make payment to avoid suspension.`
      )
    }
  }
}

export async function createAttendanceMarkedNotification(studentId: string, courseName: string, status: string) {
  const statusText = status === 'PRESENT' ? 'marked present' : status === 'LATE' ? 'marked late' : 'marked absent'
  
  await createAttendanceNotification(
    studentId,
    `Your attendance has been ${statusText} for ${courseName}.`
  )
}

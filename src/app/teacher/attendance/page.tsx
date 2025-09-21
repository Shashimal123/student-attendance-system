'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import QRCodeScanner from '@/components/QRCodeScanner'
import { motion } from 'framer-motion'

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  isActive: boolean
  payments: Array<{
    month: number
    year: number
    status: string
  }>
}

interface Course {
  id: string
  name: string
  code: string
}

export default function TeacherAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [courses, setCourses] = useState<Course[]>([])
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT'>('PRESENT')
  const [remarks, setRemarks] = useState('')
  const [isMarking, setIsMarking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [todayClasses, setTodayClasses] = useState<any[]>([])

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN'))) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
      fetchCourses()
      fetchTodayClasses()
    }
  }, [user])

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Courses fetch response status:', response.status)
      const data = await response.json()
      console.log('Courses fetch response:', data)
      
      if (data.success) {
        setCourses(data.courses)
        console.log('Courses loaded:', data.courses.length)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchTodayClasses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/classes/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success && data.classes.length > 0) {
        setTodayClasses(data.classes)
        // Auto-select the first class of the day
        setSelectedCourse(data.classes[0].course.id)
      }
    } catch (error) {
      console.error('Error fetching today\'s classes:', error)
    }
  }

  const handleQRScan = async (studentId: string) => {
    console.log('QR Code scanned:', studentId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/students/by-id/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Student lookup response status:', response.status)
      const data = await response.json()
      console.log('Student lookup response:', data)
      
      if (data.success) {
        const student = data.student

        if (!selectedCourse) {
          setMessage({ type: 'error', text: 'Please select a course first' })
          return
        }

        // Check payment status using the new API
        const paymentResponse = await fetch('/api/attendance/check-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: student.studentId,
            courseId: selectedCourse
          })
        })

        const paymentData = await paymentResponse.json()
        
        if (!paymentData.success) {
          setMessage({ type: 'error', text: 'Error checking payment status' })
          return
        }

        // Check if attendance is allowed based on payment status
        if (!paymentData.canAttend) {
          setMessage({ 
            type: 'error', 
            text: `🚫 Attendance Blocked: ${paymentData.message}` 
          })
          return
        }

        // Show payment warning if in grace period
        if (paymentData.paymentStatus === 'GRACE_PERIOD') {
          setMessage({ 
            type: 'error', 
            text: `⚠️ Payment Pending: ${paymentData.message}` 
          })
        } else {
          setMessage(null)
        }

        setScannedStudent(student)
      } else {
        setMessage({ type: 'error', text: data.error || 'Student not found' })
        setScannedStudent(null)
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      setMessage({ type: 'error', text: 'Error fetching student data' })
      setScannedStudent(null)
    }
  }

  const handleMarkAttendance = async () => {
    if (!selectedCourse || !scannedStudent) {
      setMessage({ type: 'error', text: 'Please select a course and scan a student QR code' })
      return
    }

    console.log('Marking attendance:', {
      studentId: scannedStudent.id,
      courseId: selectedCourse,
      status: attendanceStatus,
      remarks: remarks
    })

    setIsMarking(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: scannedStudent.id,
          courseId: selectedCourse,
          status: attendanceStatus,
          remarks: remarks
        })
      })

      console.log('Attendance marking response status:', response.status)
      const data = await response.json()
      console.log('Attendance marking response:', data)
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Attendance marked successfully!' })
        setScannedStudent(null)
        setRemarks('')
        setAttendanceStatus('PRESENT')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' })
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      setMessage({ type: 'error', text: 'Error marking attendance' })
    } finally {
      setIsMarking(false)
    }
  }

  const checkPaymentStatus = (student: Student) => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    const currentPayment = student.payments.find(
      p => p.month === currentMonth && p.year === currentYear
    )
    
    if (!currentPayment) {
      return { status: 'NO_PAYMENT', message: 'No payment record for this month' }
    }
    
    if (currentPayment.status === 'PAID') {
      return { status: 'PAID', message: 'Payment up to date' }
    }
    
    if (currentPayment.status === 'OVERDUE') {
      return { status: 'OVERDUE', message: 'Payment overdue - more than 2 weeks past due' }
    }
    
    return { status: 'PENDING', message: 'Payment pending' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
              >
                SmartAttend
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Mark Attendance
                </h1>
                <p className="text-gray-600">
                  Scan student QR codes to mark attendance
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/teacher/manual-attendance')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Manual Attendance
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* QR Scanner */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code Scanner</h3>
              <QRCodeScanner
                onScan={handleQRScan}
                onError={(error) => setMessage({ type: 'error', text: error })}
                className="mb-6"
              />
            </div>
          </motion.div>

          {/* Attendance Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Course Selection */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Course
              </h3>
              
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Choose a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Scanned Student Info */}
            {scannedStudent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Scanned Student
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {scannedStudent.firstName.charAt(0)}{scannedStudent.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {scannedStudent.firstName} {scannedStudent.lastName}
                      </p>
                      <p className="text-sm text-gray-600 font-mono">
                        {scannedStudent.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        scannedStudent.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {scannedStudent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Payment Status Check */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Status
                      </label>
                      {(() => {
                        const paymentStatus = checkPaymentStatus(scannedStudent)
                        return (
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            paymentStatus.status === 'PAID' 
                              ? 'bg-green-100 text-green-800'
                              : paymentStatus.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {paymentStatus.status}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Attendance Form */}
            {scannedStudent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Mark Attendance
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attendance Status
                    </label>
                    <select
                      value={attendanceStatus}
                      onChange={(e) => setAttendanceStatus(e.target.value as any)}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="PRESENT">Present</option>
                      <option value="LATE">Late</option>
                      <option value="ABSENT">Absent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Add any remarks..."
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleMarkAttendance}
                    disabled={isMarking || !selectedCourse}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isMarking ? (
                      <div className="flex items-center justify-center space-x-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Marking Attendance...</span>
                      </div>
                    ) : (
                      'Mark Attendance'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Message Display */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-600'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

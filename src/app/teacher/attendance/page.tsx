'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import QRCodeScanner from '@/components/QRCodeScanner'
import { motion } from 'framer-motion'
import { saveAttendance } from '@/lib/attendanceClient'

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
  const [isAutoMarking, setIsAutoMarking] = useState(false)
  const [currentScanValue, setCurrentScanValue] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    status: string
    message: string
    allowLatePayment: boolean
    requiresLatePayment: boolean
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN'))) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
      const controller = new AbortController()
      abortControllerRef.current = controller

      fetchCourses(controller.signal)
      fetchTodayClasses(controller.signal)

      return () => {
        controller.abort()
      }
    }
  }, [user])

  const fetchCourses = async (signal: AbortSignal) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal
      })
      
      if (signal.aborted) return

      const data = await response.json()
      
      if (data.success) {
        setCourses(data.courses || [])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error fetching courses:', error)
    }
  }

  const fetchTodayClasses = async (signal: AbortSignal) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/classes/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal
      })
      
      if (signal.aborted) return

      const data = await response.json()
      if (data.success && data.classes?.length > 0) {
        setSelectedCourse(data.classes[0].course.id)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error fetching today\'s classes:', error)
    }
  }

  const handleQRScan = async (rawValue: string) => {
    const scannedValue = rawValue?.trim()
    if (!scannedValue) {
      return
    }

    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course first' })
      return
    }

    setCurrentScanValue(scannedValue)
    setIsAutoMarking(true)
    setMessage(null)
    setPaymentInfo(null)

    const controller = new AbortController()

    try {
      const token = localStorage.getItem('token')
      
      const studentResponse = await fetch(`/api/students/by-id/${scannedValue}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })
      
      if (controller.signal.aborted) return

      const studentData = await studentResponse.json()
      
      if (!studentData.success) {
        setMessage({ type: 'error', text: studentData.error || 'Student not found' })
        setScannedStudent(null)
        return
      }

      const student = studentData.student

      const paymentResponse = await fetch('/api/attendance/check-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: student.studentId,
          courseId: selectedCourse
        }),
        signal: controller.signal
      })

      if (controller.signal.aborted) return

      const paymentData = await paymentResponse.json()
      
      if (!paymentData.success) {
        setMessage({ type: 'error', text: paymentData.error || 'Error checking payment status' })
        return
      }

      setPaymentInfo({
        status: paymentData.paymentStatus,
        message: paymentData.message,
        allowLatePayment: paymentData.allowLatePayment,
        requiresLatePayment: paymentData.requiresLatePayment
      })

      setScannedStudent(student)

      if (paymentData.paymentStatus === 'PAID') {
        const autoMarkData = await saveAttendance({
          studentId: student.id,
          courseId: selectedCourse,
          status: 'PRESENT',
          remarks: 'Marked via QR scan',
          latePayment: false,
          token: token || ''
        })

        if (autoMarkData.success) {
          setMessage({
            type: 'success',
            text: autoMarkData.alreadyMarked
              ? 'Attendance was already marked for this student today.'
              : 'Attendance marked automatically!'
          })
          setAttendanceStatus('PRESENT')
          setRemarks('')
        } else {
          setMessage({ type: 'error', text: autoMarkData.error || 'Failed to mark attendance automatically' })
        }
      } else if (paymentData.allowLatePayment) {
        setMessage({
          type: 'error',
          text: `⚠️ ${paymentData.message || 'Payment pending. Tap "Allow with Late Payment" to proceed.'}`
        })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error processing QR scan:', error)
      setMessage({ type: 'error', text: 'Error processing QR scan' })
      setScannedStudent(null)
    } finally {
      setIsAutoMarking(false)
    }
  }

  const handleMarkAttendance = async () => {
    if (!selectedCourse || !scannedStudent) {
      setMessage({ type: 'error', text: 'Please select a course and scan a student QR code' })
      return
    }

    setIsMarking(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token') || ''
      const data = await saveAttendance({
        studentId: scannedStudent.id,
        courseId: selectedCourse,
        status: attendanceStatus,
        remarks,
        latePayment: paymentInfo ? paymentInfo.status !== 'PAID' : false,
        token
      })

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.alreadyMarked
            ? 'Attendance was already marked earlier today.'
            : paymentInfo?.requiresLatePayment
              ? 'Attendance marked with late payment flag.'
              : 'Attendance marked successfully!'
        })
        setScannedStudent(null)
        setRemarks('')
        setAttendanceStatus('PRESENT')
        setPaymentInfo(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
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

  const handleLatePaymentMark = async () => {
    if (!scannedStudent || !selectedCourse) return
    setIsMarking(true)
    try {
      const token = localStorage.getItem('token') || ''
      const data = await saveAttendance({
        studentId: scannedStudent.id,
        courseId: selectedCourse,
        status: 'PRESENT',
        remarks: remarks || 'Marked with late payment override',
        latePayment: true,
        token
      })
      if (data.success) {
        setMessage({
          type: 'success',
          text: data.alreadyMarked
            ? 'Attendance was already marked for this student today.'
            : 'Attendance marked with Late Payment.'
        })
        setScannedStudent(null)
        setPaymentInfo(null)
        setRemarks('')
        setAttendanceStatus('PRESENT')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance with late payment' })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error marking late payment attendance:', error)
      setMessage({ type: 'error', text: 'Error marking attendance with late payment' })
    } finally {
      setIsMarking(false)
    }
  }

  const handleScannerError = (errorMessage: string) => {
    setMessage({ type: 'error', text: errorMessage || 'Scanner error occurred' })
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code Scanner</h3>
              <QRCodeScanner
                onResult={handleQRScan}
                onDecode={handleQRScan}
                onScan={handleQRScan}
                onError={handleScannerError}
              />
              {isAutoMarking && (
                <div className="mt-4 flex items-center space-x-3 rounded-lg bg-purple-50 border border-purple-100 px-4 py-2 text-sm text-purple-700">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"
                  />
                  <span>
                    Marking attendance{currentScanValue ? ` for ${currentScanValue}` : ''}...
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Status
                      </label>
                      {(() => {
                        const paymentStatus = paymentInfo
                          ? { status: paymentInfo.status, message: paymentInfo.message }
                          : checkPaymentStatus(scannedStudent)
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
                  {paymentInfo?.allowLatePayment && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                      {paymentInfo.message || 'Payment missing for this month.'}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attendance Status
                    </label>
                    <select
                      value={attendanceStatus}
                      onChange={(e) => setAttendanceStatus(e.target.value as 'PRESENT' | 'LATE' | 'ABSENT')}
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
                  {paymentInfo?.allowLatePayment && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLatePaymentMark}
                      disabled={isMarking}
                      className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      Allow with Late Payment
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

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

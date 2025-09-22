'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  enrollments: Array<{
    course: {
      id: string
      name: string
      code: string
    }
  }>
}

interface Course {
  id: string
  name: string
  code: string
}

export default function AttendanceScannerPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const fetchCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setCourses(data.courses)
        if (data.courses.length > 0) {
          setSelectedCourse(data.courses[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }, [])

  const markAttendance = useCallback(async (studentId: string, courseId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // Find the course to get its code
      const course = courses.find(c => c.id === courseId)
      if (!course) {
        setMessage({ type: 'error', text: 'Course not found' })
        return
      }
      
      // First check payment status using course code
      const paymentResponse = await fetch(`/api/admin/attendance/check-payment?studentId=${studentId}&courseId=${course.code}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const paymentData = await paymentResponse.json()
      
      console.log('Payment check response:', paymentData)
      
      if (!paymentData.success) {
        setMessage({ type: 'error', text: paymentData.error || 'Error checking payment status' })
        return
      }

      // Mark attendance
      const attendanceResponse = await fetch('/api/admin/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentId, // Use the studentId string, not database ID
          courseId,
          status: 'PRESENT',
          source: 'scanner'
        })
      })

      const attendanceData = await attendanceResponse.json()
      
      console.log('Attendance mark response:', attendanceData)
      
      if (attendanceData.success) {
        setScannedStudent(paymentData.student)
        
        // Show payment warning if applicable
        if (attendanceData.paymentWarning) {
          setMessage({ 
            type: 'error', 
            text: `Attendance marked but ${attendanceData.paymentWarning.message}` 
          })
        } else {
          setMessage({ type: 'success', text: 'Attendance marked successfully!' })
        }
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setMessage(null)
          setScannedStudent(null)
        }, 5000)
      } else {
        setMessage({ type: 'error', text: attendanceData.error || 'Failed to mark attendance' })
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      setMessage({ type: 'error', text: 'Error marking attendance' })
    }
  }, [courses])

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (!scanning) {
      setScanning(true)
      
      try {
        // Extract student ID from QR code
        const qrData = decodedText
        const studentId = qrData.split('-')[0] // Assuming format: STU123456-abc123
        
        console.log('QR Code scanned:', qrData)
        console.log('Extracted student ID:', studentId)
        console.log('Selected course ID:', selectedCourse)
        
        if (studentId && selectedCourse) {
          await markAttendance(studentId, selectedCourse)
        } else {
          setMessage({ type: 'error', text: 'Missing student ID or course selection' })
        }
      } catch (error) {
        console.error('Error processing scan:', error)
        setMessage({ type: 'error', text: 'Error processing QR code' })
      } finally {
        setScanning(false)
      }
    }
  }, [scanning, selectedCourse, markAttendance])

  const onScanFailure = (error: unknown) => {
    // Handle scan failure silently
    console.warn('QR scan failed:', error)
  }

  const initializeScanner = useCallback(() => {
    if (scannerContainerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      )

      scannerRef.current.render(onScanSuccess, onScanFailure)
    }
  }, [onScanSuccess])

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchCourses()
    }
  }, [user, fetchCourses])

  useEffect(() => {
    if (selectedCourse && scannerContainerRef.current && !scannerRef.current) {
      initializeScanner()
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [selectedCourse, initializeScanner])

  const closePaymentModal = () => {
    setShowPaymentModal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                QR Attendance Scanner
              </h1>
              <p className="text-gray-600">
                Scan student QR codes to mark attendance
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/attendance')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                View Reports
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course for Attendance
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        {/* QR Scanner */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Scan Student QR Code</h2>
          
          {!selectedCourse ? (
            <div className="text-center py-12 text-gray-500">
              Please select a course first to start scanning
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scanner */}
              <div className="max-w-md mx-auto">
                <div id="qr-reader" ref={scannerContainerRef}></div>
              </div>

              {/* Scan Status */}
              <div className="text-center">
                {scanning ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-600">Processing scan...</span>
                  </div>
                ) : (
                  <p className="text-gray-600">Position the QR code within the scanner frame</p>
                )}
              </div>

              {/* Last Scan Result */}
              {scannedStudent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Attendance Marked Successfully!</h3>
                  <div className="text-green-700">
                    <p><strong>Student:</strong> {scannedStudent.firstName} {scannedStudent.lastName}</p>
                    <p><strong>ID:</strong> {scannedStudent.studentId}</p>
                    <p><strong>Status:</strong> Present</p>
                    <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Payment Required</h3>
                <p className="text-sm text-gray-500 mt-2">
                  This student has unpaid fees for the first 2 weeks of the month. 
                  Please ensure payment is made before marking attendance.
                </p>
                <div className="mt-4">
                  <button
                    onClick={closePaymentModal}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

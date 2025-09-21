'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AttendanceRecord {
  id: string
  courseName: string
  date: string
  status: string
  remarks?: string
}

interface Course {
  id: string
  name: string
  code: string
}

export default function StudentAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loadingData, setLoadingData] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'STUDENT')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      fetchEnrolledCourses()
    }
  }, [user])

  useEffect(() => {
    if (selectedCourse) {
      fetchAttendanceRecords()
    }
  }, [selectedCourse, selectedMonth, selectedYear])

  const fetchEnrolledCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/student/courses/enrolled', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setCourses(data.courses.map((enrollment: any) => enrollment.course))
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
      setMessage({ type: 'error', text: 'Error fetching enrolled courses' })
    }
  }

  const fetchAttendanceRecords = async () => {
    if (!selectedCourse) return

    setLoadingData(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/student/attendance?courseId=${selectedCourse}&month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      const data = await response.json()
      if (data.success) {
        setAttendanceRecords(data.attendance)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error fetching attendance records' })
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      setMessage({ type: 'error', text: 'Error fetching attendance records' })
    } finally {
      setLoadingData(false)
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800'
      case 'ABSENT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return '✅'
      case 'LATE':
        return '⏰'
      case 'ABSENT':
        return '❌'
      default:
        return '❓'
    }
  }

  const calculateAttendanceStats = () => {
    if (attendanceRecords.length === 0) return { present: 0, late: 0, absent: 0, total: 0, percentage: 0 }

    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length
    const late = attendanceRecords.filter(r => r.status === 'LATE').length
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length
    const total = attendanceRecords.length
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    return { present, late, absent, total, percentage }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'STUDENT') {
    return null
  }

  const stats = calculateAttendanceStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Attendance
              </h1>
              <p className="text-gray-600">
                View your attendance records and statistics
              </p>
            </div>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filter Attendance Records
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
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

        {/* Attendance Statistics */}
        {selectedCourse && stats.total > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Present</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.present}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold">⏰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Late</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.late}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold">✗</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Absent</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.absent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">%</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Attendance %</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.percentage}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {selectedCourse && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance Records - {getMonthName(selectedMonth)} {selectedYear}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {attendanceRecords.length} records found
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {loadingData ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No attendance records found
                  </h3>
                  <p>No attendance has been marked for the selected period.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <span className="text-2xl">
                              {getStatusIcon(record.status)}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {record.courseName}
                            </p>
                            {record.remarks && (
                              <p className="text-sm text-gray-500 mt-1">
                                Remarks: {record.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

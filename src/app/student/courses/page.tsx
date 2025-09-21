'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Course {
  id: string
  name: string
  code: string
  description?: string
  fee: number
  duration: number
  teacher: {
    name: string
  }
  isEnrolled: boolean
}

interface EnrolledCourse {
  id: string
  course: {
    id: string
    name: string
    code: string
    description?: string
    fee: number
    duration: number
    teacher: {
      name: string
    }
  }
  enrolledAt: string
  isActive: boolean
}

export default function StudentCoursesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'STUDENT')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      fetchCourses()
      fetchEnrolledCourses()
    }
  }, [user])

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/student/courses/available', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setAvailableCourses(data.courses)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setMessage({ type: 'error', text: 'Error fetching courses' })
    } finally {
      setLoadingData(false)
    }
  }

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
        setEnrolledCourses(data.courses)
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/student/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Successfully enrolled in course!' })
        fetchCourses()
        fetchEnrolledCourses()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enroll in course' })
      }
    } catch (error) {
      console.error('Error enrolling in course:', error)
      setMessage({ type: 'error', text: 'Error enrolling in course' })
    }
  }

  const handleUnenroll = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to unenroll from this course?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/student/courses/unenroll/${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Successfully unenrolled from course!' })
        fetchCourses()
        fetchEnrolledCourses()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to unenroll from course' })
      }
    } catch (error) {
      console.error('Error unenrolling from course:', error)
      setMessage({ type: 'error', text: 'Error unenrolling from course' })
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Courses
              </h1>
              <p className="text-gray-600">
                View and manage your course enrollments
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enrolled Courses */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                My Enrolled Courses ({enrolledCourses.length})
              </h3>
            </div>
            
            <div className="p-6">
              {loadingData ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading courses...</p>
                </div>
              ) : enrolledCourses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>You are not enrolled in any courses yet.</p>
                  <p className="text-sm mt-2">Browse available courses to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.map((enrollment) => (
                    <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {enrollment.course.name}
                          </h4>
                          <p className="text-sm text-gray-500 font-mono">
                            {enrollment.course.code}
                          </p>
                          {enrollment.course.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {enrollment.course.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Teacher: {enrollment.course.teacher.name}</span>
                            <span>Fee: ${enrollment.course.fee.toFixed(2)}</span>
                            <span>Duration: {enrollment.course.duration} months</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnenroll(enrollment.id)}
                          className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Unenroll
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Courses */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Available Courses ({availableCourses.length})
              </h3>
            </div>
            
            <div className="p-6">
              {loadingData ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading courses...</p>
                </div>
              ) : availableCourses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No available courses found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableCourses.map((course) => (
                    <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {course.name}
                          </h4>
                          <p className="text-sm text-gray-500 font-mono">
                            {course.code}
                          </p>
                          {course.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {course.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Teacher: {course.teacher.name}</span>
                            <span>Fee: ${course.fee.toFixed(2)}</span>
                            <span>Duration: {course.duration} months</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={course.isEnrolled}
                          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                            course.isEnrolled
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {course.isEnrolled ? 'Enrolled' : 'Enroll'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

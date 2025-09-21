'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth: string
  address?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
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

export default function EditStudentPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    selectedCourses: [] as string[]
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStudent()
      fetchCourses()
    }
  }, [user])

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/students/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setStudent(data.student)
        setEditForm({
          firstName: data.student.firstName,
          lastName: data.student.lastName,
          phone: data.student.phone || '',
          address: data.student.address || '',
          parentName: data.student.parentName || '',
          parentPhone: data.student.parentPhone || '',
          parentEmail: data.student.parentEmail || '',
          selectedCourses: data.student.enrollments.map((e: any) => e.course.id)
        })
      }
    } catch (error) {
      console.error('Error fetching student:', error)
      setMessage({ type: 'error', text: 'Error fetching student' })
    } finally {
      setLoadingStudent(false)
    }
  }

  const fetchCourses = async () => {
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
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/students/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Student updated successfully' })
        setEditing(false)
        fetchStudent()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update student' })
      }
    } catch (error) {
      console.error('Error updating student:', error)
      setMessage({ type: 'error', text: 'Error updating student' })
    }
  }

  const handleCourseSelection = (courseId: string) => {
    setEditForm(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }))
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

  if (loadingStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Student not found</h1>
          <button
            onClick={() => router.push('/admin/students')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Students
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Student
              </h1>
              <p className="text-gray-600">
                Update student information
              </p>
            </div>
            
            <div className="flex space-x-4">
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => router.push('/admin/students')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                Back to Students
              </button>
            </div>
          </div>
        </div>
      </header>

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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Student Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="text"
                value={student.studentId}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={student.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={editing ? editForm.firstName : student.firstName}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={editing ? editForm.lastName : student.lastName}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={editing ? editForm.phone : (student.phone || '')}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={student.dateOfBirth.split('T')[0]}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={editing ? editForm.address : (student.address || '')}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Name
              </label>
              <input
                type="text"
                value={editing ? editForm.parentName : (student.parentName || '')}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, parentName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Phone
              </label>
              <input
                type="tel"
                value={editing ? editForm.parentPhone : (student.parentPhone || '')}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, parentPhone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Email
              </label>
              <input
                type="email"
                value={editing ? editForm.parentEmail : (student.parentEmail || '')}
                disabled={!editing}
                onChange={(e) => setEditForm(prev => ({ ...prev, parentEmail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg ${
                student.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {student.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrolled Courses
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {courses.map(course => (
                  <label key={course.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editForm.selectedCourses.includes(course.id)}
                      onChange={() => handleCourseSelection(course.id)}
                      disabled={!editing}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700">
                      {course.code} - {course.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

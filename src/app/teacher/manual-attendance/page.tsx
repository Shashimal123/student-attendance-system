'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  isActive: boolean
  attendanceStatus?: 'PRESENT' | 'LATE' | 'ABSENT'
}

interface Course {
  id: string
  name: string
  code: string
}

export default function ManualAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN'))) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
      fetchCourses()
    }
  }, [user])

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsForCourse(selectedCourse)
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/teacher/courses', {
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

  const fetchStudentsForCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/teacher/courses/${courseId}/students-unmarked`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setStudents(data.students.map((student: any) => ({
          ...student,
          attendanceStatus: 'PRESENT' // Default status
        })))
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleAttendanceChange = (studentId: string, status: 'PRESENT' | 'LATE' | 'ABSENT') => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, attendanceStatus: status }
        : student
    ))
  }

  const handleMarkIndividualAttendance = async (studentId: string) => {
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course' })
      return
    }

    const student = students.find(s => s.id === studentId)
    if (!student) {
      setMessage({ type: 'error', text: 'Student not found' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const attendanceData = [{
        studentId: student.id,
        courseId: selectedCourse,
        status: student.attendanceStatus || 'PRESENT',
        remarks: ''
      }]

      const response = await fetch('/api/attendance/bulk-mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceRecords: attendanceData })
      })

      const data = await response.json()
      
             if (data.success) {
         // Remove this student from the list since attendance is already marked
         const remainingStudents = students.filter(s => s.id !== studentId)
         setStudents(remainingStudents)
         
         const remainingCount = remainingStudents.length
         if (remainingCount === 0) {
           setMessage({ type: 'success', text: `Attendance marked successfully for ${student.firstName} ${student.lastName}! All students have been marked for attendance.` })
         } else {
           setMessage({ type: 'success', text: `Attendance marked successfully for ${student.firstName} ${student.lastName}! ${remainingCount} student(s) remaining.` })
         }
       } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' })
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      setMessage({ type: 'error', text: 'Error marking attendance' })
    } finally {
      setIsSubmitting(false)
    }
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
                  Manual Attendance
                </h1>
                <p className="text-gray-600">
                  Mark attendance for all students in a course
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/teacher/attendance')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                QR Scanner
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
          className="space-y-6"
        >
          {/* Course Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
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

          {/* Students List */}
          {selectedCourse && students.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6"
            >
                                   <div className="mb-6">
                       <h3 className="text-lg font-semibold text-gray-900">
                         Students ({students.length})
                       </h3>
                     </div>
              
                                   <div className="space-y-4">
                       {students.map((student, index) => (
                         <motion.div
                           key={student.id}
                           initial={{ opacity: 0, x: -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: index * 0.1 }}
                           className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                         >
                           <div className="flex items-center space-x-4">
                             <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                               {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                             </div>
                             <div>
                               <p className="font-semibold text-gray-900">
                                 {student.firstName} {student.lastName}
                               </p>
                               <p className="text-sm text-gray-600 font-mono">
                                 {student.studentId}
                               </p>
                             </div>
                           </div>
                           
                           <div className="flex items-center space-x-4">
                             <div className="flex space-x-2">
                               {(['PRESENT', 'LATE', 'ABSENT'] as const).map((status) => (
                                 <motion.button
                                   key={status}
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={() => handleAttendanceChange(student.id, status)}
                                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                     student.attendanceStatus === status
                                       ? status === 'PRESENT'
                                         ? 'bg-green-500 text-white shadow-lg'
                                         : status === 'LATE'
                                         ? 'bg-yellow-500 text-white shadow-lg'
                                         : 'bg-red-500 text-white shadow-lg'
                                       : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                   }`}
                                 >
                                   {status}
                                 </motion.button>
                               ))}
                             </div>
                             
                             <motion.button
                               whileHover={{ scale: 1.02 }}
                               whileTap={{ scale: 0.98 }}
                               onClick={() => handleMarkIndividualAttendance(student.id)}
                               disabled={isSubmitting}
                               className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm"
                             >
                               {isSubmitting ? (
                                 <motion.div
                                   animate={{ rotate: 360 }}
                                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                   className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                 />
                               ) : (
                                 'Mark'
                               )}
                             </motion.button>
                           </div>
                         </motion.div>
                       ))}
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

          {/* Empty State */}
          {selectedCourse && students.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12 text-center"
            >
              <div className="text-6xl mb-4">👨‍🎓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">No students are enrolled in this course.</p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

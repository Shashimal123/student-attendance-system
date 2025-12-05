'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Payment {
  id: string
  student: {
    firstName: string
    lastName: string
    studentId: string
    phone: string
    user: {
      email: string
    }
  }
  course: {
    name: string
    code: string
    fee: number
    teacher: {
      firstName: string
      lastName: string
    }
  }
  month: number
  year: number
  amount: number
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'GRACE_PERIOD'
  dueDate: string
  paidDate?: string
  paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'OTHER'
  reference?: string
  gracePeriodStart?: string
  gracePeriodEnd?: string
}

interface TeacherPayout {
  id: string
  teacher: {
    firstName: string
    lastName: string
    phone: string
  }
  course: {
    name: string
    code: string
    fee: number
  }
  month: number
  year: number
  totalCollected: number
  teacherShare: number
  instituteShare: number
  payoutDate?: string
  status: string
  createdAt: string
}

interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  enrollments: Array<{
    courseName: string
    courseCode: string
  }>
}

interface Course {
  id: string
  name: string
  code: string
  fee: number
}

type TabType = 'pending' | 'registration' | 'reports'

export default function AdminPaymentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [payments, setPayments] = useState<Payment[]>([])
  const [teacherPayouts, setTeacherPayouts] = useState<TeacherPayout[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  const [statistics, setStatistics] = useState({
    totalCollected: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    gracePeriodAmount: 0,
    totalPayments: 0
  })
  const [payoutStatistics, setPayoutStatistics] = useState({
    totalCollected: 0,
    totalTeacherShare: 0,
    totalInstituteShare: 0,
    totalPayouts: 0
  })

  // Payment Registration Form State
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [registrationForm, setRegistrationForm] = useState({
    studentId: '',
    courseId: '',
    amount: '',
    paymentMethod: 'CASH' as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'OTHER',
    reference: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([])
  const [selectedCourseFee, setSelectedCourseFee] = useState<number>(0)

  // Report Generation State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchPayments()
      fetchTeacherPayouts()
      fetchStudents()
      fetchCourses()
    }
  }, [user])

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
        setStatistics(data.statistics || {})
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchTeacherPayouts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/payments/teacher-payouts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTeacherPayouts(data.payouts || [])
        setPayoutStatistics(data.statistics || {})
      }
    } catch (error) {
      console.error('Error fetching teacher payouts:', error)
    } finally {
      setLoadingPayouts(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
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

      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudentsByCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/payments/students-by-course?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEnrolledStudents(data.students || [])
        setSelectedCourseFee(data.course?.fee || 0)
        
        // Auto-fill amount with course fee
        setRegistrationForm(prev => ({
          ...prev,
          amount: data.course?.fee?.toString() || ''
        }))
      } else {
        setEnrolledStudents([])
        setSelectedCourseFee(0)
      }
    } catch (error) {
      console.error('Error fetching students by course:', error)
      setEnrolledStudents([])
      setSelectedCourseFee(0)
    }
  }

  const handlePaymentRegistration = async () => {
    if (!registrationForm.studentId || !registrationForm.courseId || !registrationForm.amount) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...registrationForm,
          amount: parseFloat(registrationForm.amount),
          status: 'PAID',
          isManualRegistration: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment registered successfully!' })
        setShowRegistrationModal(false)
        setRegistrationForm({
          studentId: '',
          courseId: '',
          amount: '',
          paymentMethod: 'CASH',
          reference: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
        setEnrolledStudents([])
        setSelectedCourseFee(0)
        fetchPayments()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to register payment' })
      }
    } catch (error) {
      console.error('Error registering payment:', error)
      setMessage({ type: 'error', text: 'Error registering payment' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateTeacherPayouts = async () => {
    setGeneratingReport(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/payments/teacher-payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: reportMonth,
          year: reportYear
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `Teacher payouts generated for ${reportMonth}/${reportYear}` })
        fetchTeacherPayouts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate payouts' })
      }
    } catch (error) {
      console.error('Error generating teacher payouts:', error)
      setMessage({ type: 'error', text: 'Error generating teacher payouts' })
    } finally {
      setGeneratingReport(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'GRACE_PERIOD':
        return 'bg-orange-100 text-orange-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'CASH':
        return 'Cash'
      case 'CARD':
        return 'Card'
      case 'BANK_TRANSFER':
        return 'Bank Transfer'
      case 'MOBILE_PAYMENT':
        return 'Mobile Payment'
      case 'OTHER':
        return 'Other'
      default:
        return 'Not specified'
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
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

  if (!user || user.role !== 'ADMIN') {
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
                <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
                <p className="text-gray-600">Manage student payments and teacher payouts</p>
              </div>
            </div>
            
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
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Payment Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-gray-900">Rs {statistics.totalCollected.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">Rs {statistics.pendingAmount.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Grace Period</p>
                  <p className="text-2xl font-bold text-gray-900">Rs {statistics.gracePeriodAmount.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">Rs {statistics.overdueAmount.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚫</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden"
          >
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'pending', label: 'Pending Payments', icon: '⏳' },
                  { id: 'registration', label: 'Payment Registration', icon: '💰' },
                  { id: 'reports', label: 'Reports', icon: '📊' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Pending Payments Tab */}
              {activeTab === 'pending' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Pending Payments</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setRegistrationForm({
                          studentId: '',
                          courseId: '',
                          amount: '',
                          paymentMethod: 'CASH',
                          reference: '',
                          month: new Date().getMonth() + 1,
                          year: new Date().getFullYear()
                        })
                        setEnrolledStudents([])
                        setSelectedCourseFee(0)
                        setShowRegistrationModal(true)
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      Register Payment
                    </motion.button>
                  </div>

                  {loadingPayments ? (
                    <div className="text-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
                      />
                      <p className="text-gray-600">Loading payments...</p>
                    </div>
                  ) : payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Course
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Period
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {payments.map((payment) => (
                            <motion.tr
                              key={payment.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {payment.student.firstName} {payment.student.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {payment.student.studentId}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {payment.course.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {payment.course.code}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {getMonthName(payment.month)} {payment.year}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                Rs {payment.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                                  {payment.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(payment.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setRegistrationForm({
                                      studentId: payment.student.studentId,
                                      courseId: payment.course.code,
                                      amount: payment.amount.toString(),
                                      paymentMethod: 'CASH',
                                      reference: '',
                                      month: payment.month,
                                      year: payment.year
                                    })
                                    // Fetch students for this course
                                    fetchStudentsByCourse(payment.course.code)
                                    setShowRegistrationModal(true)
                                  }}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  Mark Paid
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">✅</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Payments</h3>
                      <p className="text-gray-600">All payments are up to date!</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Payment Registration Tab */}
              {activeTab === 'registration' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💰</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Registration</h3>
                    <p className="text-gray-600 mb-6">Register manual payments for students</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setRegistrationForm({
                          studentId: '',
                          courseId: '',
                          amount: '',
                          paymentMethod: 'CASH',
                          reference: '',
                          month: new Date().getMonth() + 1,
                          year: new Date().getFullYear()
                        })
                        setEnrolledStudents([])
                        setSelectedCourseFee(0)
                        setShowRegistrationModal(true)
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Register New Payment
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    {/* Teacher Payouts Section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Teacher Payouts</h3>
                        <div className="flex items-center space-x-4">
                          <select
                            value={reportMonth}
                            onChange={(e) => setReportMonth(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month}>
                                {getMonthName(month)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={reportYear}
                            onChange={(e) => setReportYear(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={generateTeacherPayouts}
                            disabled={generatingReport}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50"
                          >
                            {generatingReport ? 'Generating...' : 'Generate Payouts'}
                          </motion.button>
                        </div>
                      </div>

                      {loadingPayouts ? (
                        <div className="text-center py-8">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
                          />
                          <p className="text-gray-600">Loading payouts...</p>
                        </div>
                      ) : teacherPayouts.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Teacher
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Course
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Period
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total Collected
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Teacher Share (70%)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Institute Share (30%)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {teacherPayouts.map((payout) => (
                                <motion.tr
                                  key={payout.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {payout.teacher.firstName} {payout.teacher.lastName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {payout.course.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {payout.course.code}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {getMonthName(payout.month)} {payout.year}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    Rs {payout.totalCollected.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                    Rs {payout.teacherShare.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                    Rs {payout.instituteShare.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      payout.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {payout.status}
                                    </span>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">📊</div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payouts Generated</h3>
                          <p className="text-gray-600">Generate teacher payouts for the selected period</p>
                        </div>
                      )}
                    </div>

                    {/* Summary Statistics */}
                    {payoutStatistics.totalCollected > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-green-50 rounded-lg p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <span className="text-2xl">💰</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-green-800">Total Collected</p>
                              <p className="text-2xl font-bold text-green-900">Rs {payoutStatistics.totalCollected.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <span className="text-2xl">👨‍🏫</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-blue-800">Teacher Share</p>
                              <p className="text-2xl font-bold text-blue-900">Rs {payoutStatistics.totalTeacherShare.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <span className="text-2xl">🏫</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-purple-800">Institute Share</p>
                              <p className="text-2xl font-bold text-purple-900">Rs {payoutStatistics.totalInstituteShare.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Payment Registration Modal */}
      {showRegistrationModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowRegistrationModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Register Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={registrationForm.courseId}
                  onChange={(e) => {
                    const courseId = e.target.value
                    setRegistrationForm(prev => ({ 
                      ...prev, 
                      courseId,
                      studentId: '', // Reset student selection when course changes
                      amount: '' // Reset amount when course changes
                    }))
                    if (courseId) {
                      fetchStudentsByCourse(courseId)
                    } else {
                      setEnrolledStudents([])
                      setSelectedCourseFee(0)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.code} value={course.code}>
                      {course.name} ({course.code}) - Rs {course.fee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <select
                  value={registrationForm.studentId}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, studentId: e.target.value }))}
                  disabled={!registrationForm.courseId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {registrationForm.courseId 
                      ? enrolledStudents.length > 0 
                        ? 'Select a student...' 
                        : 'No students enrolled in this course'
                      : 'Please select a course first'
                    }
                  </option>
                  {enrolledStudents.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.firstName} {student.lastName} ({student.studentId})
                    </option>
                  ))}
                </select>
                {registrationForm.courseId && enrolledStudents.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No students are enrolled in this course</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount {selectedCourseFee > 0 && `(Course Fee: Rs ${selectedCourseFee})`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={registrationForm.amount}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-600"
                  placeholder={selectedCourseFee > 0 ? `Enter amount (suggested: Rs ${selectedCourseFee})` : "Enter amount"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={registrationForm.paymentMethod}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_PAYMENT">Mobile Payment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference (Optional)</label>
                <input
                  type="text"
                  value={registrationForm.reference}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Transaction ID, receipt number, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={registrationForm.month}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={registrationForm.year}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRegistrationModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePaymentRegistration}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Registering...</span>
                  </div>
                ) : (
                  'Register Payment'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

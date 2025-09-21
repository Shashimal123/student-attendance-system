'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalCourses: number
  attendanceRate: number
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    attendanceRate: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [classSchedules, setClassSchedules] = useState<any[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleForm, setScheduleForm] = useState({
    courseId: '',
    time: '',
    duration: 60
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchClassSchedules()
      fetchUpcomingClasses()
      fetchCourses()
    }
  }, [user])

  useEffect(() => {
    fetchClassSchedules()
  }, [currentDate])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchClassSchedules = async () => {
    try {
      const token = localStorage.getItem('token')
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const response = await fetch(`/api/classes/schedule?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setClassSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Error fetching class schedules:', error)
    }
  }

  const fetchUpcomingClasses = async () => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date()
      const response = await fetch(`/api/classes/schedule?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const schedules = data.schedules || []
        
        // Filter for upcoming classes (today and future)
        const upcoming = schedules.filter((schedule: any) => {
          const scheduleDate = new Date(schedule.date)
          return scheduleDate >= today
        }).slice(0, 5) // Show only next 5 classes
        
        setUpcomingClasses(upcoming)
      }
    } catch (error) {
      console.error('Error fetching upcoming classes:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/teacher/courses', {
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

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
    setShowScheduleModal(true)
  }

  const [scheduleMessage, setScheduleMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !scheduleForm.courseId || !scheduleForm.time) {
      setScheduleMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setIsSubmitting(true)
    setScheduleMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/classes/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: scheduleForm.courseId,
          date: selectedDate.toISOString(),
          time: scheduleForm.time,
          duration: scheduleForm.duration
        })
      })

      const data = await response.json()

      if (response.ok) {
        setScheduleMessage({ type: 'success', text: 'Class scheduled successfully!' })
        setTimeout(() => {
          setShowScheduleModal(false)
          setSelectedDate(null)
          setScheduleForm({ courseId: '', time: '', duration: 60 })
          setScheduleMessage(null)
          fetchClassSchedules()
          fetchUpcomingClasses()
        }, 1500)
      } else {
        setScheduleMessage({ type: 'error', text: data.error || 'Failed to schedule class' })
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
      setScheduleMessage({ type: 'error', text: 'Error creating schedule' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  const hasClassOnDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return classSchedules.some(schedule => {
      const scheduleDate = new Date(schedule.date)
      return scheduleDate.toDateString() === date.toDateString()
    })
  }

  const getClassesForDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return classSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date)
      return scheduleDate.toDateString() === date.toDateString()
    })
  }

  const getRoleBasedNavigation = () => {
    if (!user) return []

    switch (user.role) {
             case 'ADMIN':
         return [
           { name: 'QR Scan Attendance', href: '/teacher/attendance', icon: '📱', color: 'from-purple-500 to-pink-500' },
           { name: 'Manual Attendance', href: '/teacher/manual-attendance', icon: '📝', color: 'from-blue-500 to-cyan-500' },
           { name: 'Manage Students', href: '/admin/students', icon: '👨‍🎓', color: 'from-green-500 to-emerald-500' },
           { name: 'Manage Teachers', href: '/admin/teachers', icon: '👨‍🏫', color: 'from-orange-500 to-red-500' },
           { name: 'Manage Courses', href: '/admin/courses', icon: '📚', color: 'from-yellow-500 to-orange-500' },
           { name: 'Attendance Reports', href: '/admin/reports', icon: '📊', color: 'from-gray-500 to-slate-500' },
           { name: 'Payment Management', href: '/admin/payments', icon: '💰', color: 'from-indigo-500 to-purple-500' },
           { name: 'System Settings', href: '/admin/settings', icon: '⚙️', color: 'from-slate-500 to-gray-500' },
           { name: 'Schedule Management', href: '/classes/schedule-management', icon: '📅', color: 'from-teal-500 to-cyan-500' }
         ]
             case 'TEACHER':
         return [
           { name: 'QR Scan Attendance', href: '/teacher/attendance', icon: '📱', color: 'from-purple-500 to-pink-500' },
           { name: 'Manual Attendance', href: '/teacher/manual-attendance', icon: '📝', color: 'from-blue-500 to-cyan-500' },
           { name: 'My Courses', href: '/teacher/courses', icon: '📚', color: 'from-green-500 to-emerald-500' },
           { name: 'Student List', href: '/teacher/students', icon: '👨‍🎓', color: 'from-orange-500 to-red-500' },
           { name: 'Attendance Reports', href: '/teacher/reports', icon: '📊', color: 'from-yellow-500 to-orange-500' },
           { name: 'Payment History', href: '/teacher/payments', icon: '💰', color: 'from-indigo-500 to-purple-500' },
           { name: 'My Profile', href: '/teacher/profile', icon: '👤', color: 'from-teal-500 to-cyan-500' },
           { name: 'Settings', href: '/teacher/settings', icon: '⚙️', color: 'from-slate-500 to-gray-500' },
           { name: 'Schedule Management', href: '/classes/schedule-management', icon: '📅', color: 'from-teal-500 to-cyan-500' }
         ]
      case 'STUDENT':
        return [
          { name: 'My Attendance', href: '/student/attendance', icon: '📊', color: 'from-purple-500 to-pink-500' },
          { name: 'My Courses', href: '/student/courses', icon: '📚', color: 'from-blue-500 to-cyan-500' },
          { name: 'My Profile', href: '/student/profile', icon: '👤', color: 'from-green-500 to-emerald-500' },
          { name: 'Payment History', href: '/student/payments', icon: '💰', color: 'from-yellow-500 to-orange-500' }
        ]
      default:
        return []
    }
  }

  const getFilteredNavigationItems = () => {
    const allItems = getRoleBasedNavigation()
    if (!searchTerm.trim()) return allItems
    
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
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

  if (!user) {
    return null
  }

  const navigationItems = getFilteredNavigationItems()

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
                className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
              >
                SmartAttend
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search here..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </div>

              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A4 4 0 004 6v6a4 4 0 004 4h6a4 4 0 004-4V6a4 4 0 00-4-4H6a4 4 0 00-2.83 1.17z" />
                </svg>
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </motion.button>

              {/* User Profile */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName || user.email.split('@')[0]}
                </span>
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>

              {/* Logout Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem('token')
                  router.push('/login')
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left Column - Navigation */}
          <div className="lg:col-span-2">
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {navigationItems.length > 0 ? (
                  navigationItems.map((item, index) => (
                    <motion.div
                      key={item.name}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => router.push(item.href)}
                        className={`w-full p-6 bg-gradient-to-r ${item.color} rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-white text-left group`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                            {item.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-white/80 text-sm">Access {item.name.toLowerCase()}</p>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    variants={itemVariants}
                    className="col-span-full text-center py-12"
                  >
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                    <p className="text-gray-500 mb-4">
                      No quick actions match "{searchTerm}"
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSearchTerm('')}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      Clear Search
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Status Section */}
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Students Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow-lg p-6 border border-orange-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                      <p className="text-xs text-gray-500">Registered students</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👨‍🎓</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.totalStudents / 100) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="bg-gradient-to-r from-orange-400 to-yellow-400 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Teachers Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow-lg p-6 border border-pink-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
                      <p className="text-xs text-gray-500">Registered teachers</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👨‍🏫</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.totalTeachers / 20) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="bg-gradient-to-r from-pink-400 to-rose-400 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Courses Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow-lg p-6 border border-green-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Courses</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                      <p className="text-xs text-gray-500">Active courses</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📚</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.totalCourses / 50) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.9 }}
                        className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
              <div className="bg-white rounded-xl shadow-lg p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {(showAllActivity ? recentActivity : recentActivity.slice(0, 5)).map((activity, index) => (
                      <motion.div
                        key={activity.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">📝</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* See More/Less Button */}
                    {recentActivity.length > 5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4 border-t border-gray-100"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAllActivity(!showAllActivity)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
                        >
                          {showAllActivity ? 'Show Less' : `See More (${recentActivity.length - 5} more)`}
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Calendar & Upcoming */}
          <div className="space-y-8">
                         {/* Calendar */}
             <motion.div
               variants={itemVariants}
               className="bg-white rounded-xl shadow-lg p-6"
             >
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
                 <div className="flex space-x-2">
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => {
                       const prevMonth = new Date(currentDate)
                       prevMonth.setMonth(prevMonth.getMonth() - 1)
                       setCurrentDate(prevMonth)
                     }}
                     className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                   >
                     ←
                   </motion.button>
                   <span className="text-sm font-medium text-gray-700">
                     {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                   </span>
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => {
                       const nextMonth = new Date(currentDate)
                       nextMonth.setMonth(nextMonth.getMonth() + 1)
                       setCurrentDate(nextMonth)
                     }}
                     className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                   >
                     →
                   </motion.button>
                 </div>
               </div>
               
               <div className="grid grid-cols-7 gap-1 text-center">
                 {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                   <div key={day} className="text-xs font-medium text-gray-500 py-2">
                     {day}
                   </div>
                 ))}
                 
                 {/* Get first day of month and total days */}
                 {(() => {
                   const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
                   const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
                   const days = []
                   
                   // Add empty cells for days before first day of month
                   for (let i = 0; i < firstDay; i++) {
                     days.push(<div key={`empty-${i}`} className="py-2"></div>)
                   }
                   
                   // Add days of month
                   for (let day = 1; day <= totalDays; day++) {
                     const hasClass = hasClassOnDate(day)
                     const isTodayDate = isToday(day)
                     
                     days.push(
                       <motion.div
                         key={day}
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => handleDateClick(day)}
                         className={`text-sm py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                           isTodayDate
                             ? 'bg-blue-500 text-white font-semibold'
                             : hasClass
                             ? 'bg-purple-500 text-white'
                             : 'hover:bg-gray-100'
                         }`}
                       >
                         {day}
                         {hasClass && (
                           <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>
                         )}
                       </motion.div>
                     )
                   }
                   
                   return days
                 })()}
               </div>
               
               {/* Today's Classes */}
               {(() => {
                 const todayClasses = getClassesForDate(new Date().getDate())
                 if (todayClasses.length > 0) {
                   return (
                     <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                       <h4 className="text-sm font-semibold text-blue-900 mb-2">Today's Classes</h4>
                       <div className="space-y-1">
                         {todayClasses.map((schedule, index) => (
                           <div key={index} className="text-xs text-blue-700">
                             {schedule.course.name} - {schedule.time} ({schedule.duration}min)
                           </div>
                         ))}
                       </div>
                     </div>
                   )
                 }
                 return null
               })()}
             </motion.div>

            {/* Upcoming Classes */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Classes</h3>
              <div className="space-y-4">
                {upcomingClasses.length > 0 ? (
                  upcomingClasses.map((schedule, index) => {
                    const scheduleDate = new Date(schedule.date)
                    const isToday = scheduleDate.toDateString() === new Date().toDateString()
                    const isTomorrow = scheduleDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
                    
                    let dateDisplay = scheduleDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                    
                    if (isToday) {
                      dateDisplay = 'Today'
                    } else if (isTomorrow) {
                      dateDisplay = 'Tomorrow'
                    }
                    
                    return (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="text-sm font-medium text-gray-600 min-w-[60px]">
                          {dateDisplay}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{schedule.course.name}</p>
                          <p className="text-xs text-gray-500">{schedule.time} ({schedule.duration}min)</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 bg-${isToday ? 'blue' : 'green'}-500 rounded-full`}></div>
                            <span className="text-xs text-gray-500">
                              {isToday ? 'Today' : 'Scheduled'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-gray-500">No upcoming classes scheduled</p>
                    <p className="text-xs text-gray-400 mt-2">Schedule classes using the calendar</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {[
                  { date: '26 Sept', title: 'Practical Theory', type: 'Assignments', color: 'red' },
                  { date: '27 Sept', title: 'Practical Theory 1', type: 'Test', color: 'green' },
                  { date: '28 Sept', title: 'Practical Theory 2', type: 'Lessons', color: 'blue' },
                  { date: '29 Sept', title: 'Practical Theory 3', type: 'Assignments', color: 'red' }
                ].map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="text-sm font-medium text-gray-600 min-w-[60px]">
                      {event.date}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 bg-${event.color}-500 rounded-full`}></div>
                        <span className="text-xs text-gray-500">{event.type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
                 </motion.div>
       </main>

       {/* Schedule Modal */}
       {showScheduleModal && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           onClick={() => setShowScheduleModal(false)}
         >
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.9, opacity: 0 }}
             className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
             onClick={(e) => e.stopPropagation()}
           >
             <h3 className="text-lg font-semibold text-gray-900 mb-4">
               Schedule Class for {selectedDate?.toLocaleDateString()}
             </h3>
             
                           <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <select
                    value={scheduleForm.courseId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, courseId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    min="15"
                    max="180"
                    step="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Message Display */}
                {scheduleMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg text-sm ${
                      scheduleMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-600'
                        : 'bg-red-50 border border-red-200 text-red-600'
                    }`}
                  >
                    {scheduleMessage.text}
                  </motion.div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowScheduleModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleScheduleSubmit}
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
                      <span>Scheduling...</span>
                    </div>
                  ) : (
                    'Schedule'
                  )}
                </motion.button>
              </div>
           </motion.div>
         </motion.div>
       )}
     </div>
   )
 }

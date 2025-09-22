'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'

interface StudentData {
  id: string
  studentId: string
  firstName: string
  lastName: string
  phone: string
  photo?: string
  qrCode: string
  enrollments: Array<{
    courseName: string
    courseCode: string
  }>
}

export default function StudentIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStudentData()
    }
  }, [user, resolvedParams.id])

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/students/${resolvedParams.id}/id-card`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setStudent(data.student)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error fetching student data' })
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
      setMessage({ type: 'error', text: 'Error fetching student data' })
    } finally {
      setLoadingData(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const element = document.getElementById('id-card')
    if (!element) return

    // Create a canvas to capture the card
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 400

    // Convert the card to canvas
    const data = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${element.outerHTML}
        </div>
      </foreignObject>
    </svg>`

    const img = new Image()
    const svg = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svg)

    img.onload = () => {
      context.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      // Download the image
      const link = document.createElement('a')
      link.download = `student-id-${student?.studentId}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    img.src = url
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

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading student data...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Not Found</h2>
          <button
            onClick={() => router.push('/admin/students')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Back to Students
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Student ID Card
              </h1>
              <p className="text-gray-600">
                {student.firstName} {student.lastName} - {student.studentId}
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Print ID Card
              </button>
              <button
                onClick={handleDownload}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200"
              >
                Download Image
              </button>
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

        {/* ID Card */}
        <div className="flex justify-center">
          <div 
            id="id-card"
            className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl print:shadow-none print:max-w-none"
            style={{ width: '600px', height: '400px' }}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">STUDENT ID CARD</h1>
                  <p className="text-blue-200 text-sm">Student Attendance System</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-200">Valid Until</p>
                  <p className="font-semibold">December 2025</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex">
                {/* Left side - Student info */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {student.photo ? (
                      <img 
                        src={student.photo} 
                        alt={`${student.firstName} ${student.lastName}`}
                        className="w-24 h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-32 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {student.firstName} {student.lastName}
                      </h2>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex">
                          <span className="font-semibold text-gray-600 w-20">ID:</span>
                          <span className="font-mono text-gray-900">{student.studentId}</span>
                        </div>
                        
                        {student.phone && (
                          <div className="flex">
                            <span className="font-semibold text-gray-600 w-20">Phone:</span>
                            <span className="text-gray-900">{student.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex">
                          <span className="font-semibold text-gray-600 w-20">Courses:</span>
                          <div className="flex-1">
                            {student.enrollments.map((enrollment, index) => (
                              <div key={index} className="text-gray-900">
                                {enrollment.courseCode} - {enrollment.courseName}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - QR Code */}
                <div className="ml-6 flex flex-col items-center">
                  <div className="bg-white p-2 rounded-lg border-2 border-gray-200">
                    <img 
                      src={student.qrCode} 
                      alt="QR Code" 
                      className="w-32 h-32"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Scan for attendance
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div>
                    <p>This card is property of the institution</p>
                    <p>Report lost cards immediately</p>
                  </div>
                  <div className="text-right">
                    <p>Generated on: {new Date().toLocaleDateString()}</p>
                    <p>ID: {student.id.slice(-8)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md print:hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Click "Print ID Card" to print the student ID card</li>
            <li>Click "Download Image" to save the ID card as a PNG image</li>
            <li>The QR code can be scanned for attendance tracking</li>
            <li>This card contains all necessary student information</li>
          </ul>
        </div>
      </main>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          #id-card {
            box-shadow: none !important;
            border: 1px solid #ccc;
          }
        }
      `}</style>
    </div>
  )
}

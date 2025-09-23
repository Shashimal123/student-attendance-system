'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import QRCodeDisplay from '@/components/QRCodeDisplay'

export default function StudentQRCodePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [studentData, setStudentData] = useState<any>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'STUDENT')) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      fetchStudentData()
    }
  }, [user])

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setStudentData(data.user.profile)
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
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

  if (!studentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My QR Code
              </h1>
              <p className="text-gray-600">
                Your unique QR code for attendance marking
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Display */}
          <div>
            <QRCodeDisplay
              studentId={studentData.qrCode}
              studentName={`${studentData.firstName} ${studentData.lastName}`}
              className="h-fit"
            />
          </div>

          {/* Student Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Student Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student ID
                </label>
                <p className="mt-1 text-sm text-gray-900 font-mono">
                  {studentData.studentId}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {studentData.firstName} {studentData.lastName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(studentData.dateOfBirth).toLocaleDateString()}
                </p>
              </div>

              {studentData.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {studentData.phone}
                  </p>
                </div>
              )}

              {studentData.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {studentData.address}
                  </p>
                </div>
              )}

              {studentData.parentName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent/Guardian
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {studentData.parentName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use Your QR Code
          </h3>
          <div className="space-y-2 text-blue-800">
            <p>• Present this QR code to your teacher when marking attendance</p>
            <p>• The QR code contains your unique student ID</p>
            <p>• You can download and print the QR code for offline use</p>
            <p>• Keep your QR code secure and don't share it with others</p>
          </div>
        </div>
      </main>
    </div>
  )
}

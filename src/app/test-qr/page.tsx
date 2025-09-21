'use client'

import { useState } from 'react'
import QRCodeScanner from '@/components/QRCodeScanner'
import QRCodeDisplay from '@/components/QRCodeDisplay'

export default function TestQRPage() {
  const [testStudentId, setTestStudentId] = useState('')
  const [testCourseId, setTestCourseId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [scannedData, setScannedData] = useState<string>('')

  const handleQRScan = (data: string) => {
    console.log('QR Code scanned:', data)
    setScannedData(data)
    setTestStudentId(data) // Auto-fill the student ID field
  }

  const handleQRError = (error: string) => {
    console.error('QR Scanner error:', error)
    setResult({
      type: 'qr_error',
      error: error
    })
  }

  const testStudentLookup = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/students/by-id/${testStudentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      setResult({
        type: 'student',
        status: response.status,
        data: data
      })
    } catch (error) {
      setResult({
        type: 'student',
        error: error
      })
    }
  }

  const testCourseLookup = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      setResult({
        type: 'courses',
        status: response.status,
        data: data
      })
    } catch (error) {
      setResult({
        type: 'courses',
        error: error
      })
    }
  }

  const testAttendanceMarking = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: testStudentId,
          courseId: testCourseId,
          status: 'PRESENT',
          remarks: 'Test attendance'
        })
      })
      
      const data = await response.json()
      setResult({
        type: 'attendance',
        status: response.status,
        data: data
      })
    } catch (error) {
      setResult({
        type: 'attendance',
        error: error
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">QR Code Scanning Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Scanner */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">QR Code Scanner</h2>
            <QRCodeScanner
              onScan={handleQRScan}
              onError={handleQRError}
              className="mb-4"
            />
            {scannedData && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Scanned:</strong> {scannedData}
                </p>
              </div>
            )}
          </div>

          {/* QR Code Generator */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">QR Code Generator</h2>
            <QRCodeDisplay
              studentId="STU579494"
              studentName="Jane Smith"
              className="mb-4"
            />
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Generate a QR code for testing the scanner
              </p>
              <p className="text-xs text-gray-500">
                Use this QR code to test the scanner functionality
              </p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="space-y-6">
            {/* Student Lookup Test */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Student Lookup Test</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID or QR Code
                  </label>
                  <input
                    type="text"
                    value={testStudentId}
                    onChange={(e) => setTestStudentId(e.target.value)}
                    placeholder="Enter student ID or QR code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <button
                  onClick={testStudentLookup}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Test Student Lookup
                </button>
              </div>
            </div>

            {/* Course Lookup Test */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Course Lookup Test</h2>
              <div className="space-y-4">
                <button
                  onClick={testCourseLookup}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Test Course Lookup
                </button>
              </div>
            </div>

            {/* Attendance Marking Test */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Attendance Marking Test</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={testStudentId}
                    onChange={(e) => setTestStudentId(e.target.value)}
                    placeholder="Enter student ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course ID
                  </label>
                  <input
                    type="text"
                    value={testCourseId}
                    onChange={(e) => setTestCourseId(e.target.value)}
                    placeholder="Enter course ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={testAttendanceMarking}
                className="w-full mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Test Attendance Marking
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Sample Data */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Sample Data</h2>
          <div className="text-sm text-gray-600">
            <p><strong>Sample Student IDs:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>STU579494 (Jane Smith)</li>
              <li>STU861488 (Yasan Ranasinghe)</li>
            </ul>
            <p className="mt-2"><strong>Sample QR Codes:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>STU1756734579494-3bbwfiwp (Jane Smith)</li>
              <li>STU861488-3e9c41b3 (Yasan Ranasinghe)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

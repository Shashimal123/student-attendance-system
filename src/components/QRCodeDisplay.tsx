'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  studentId: string
  studentName: string
  className?: string
}

export default function QRCodeDisplay({ studentId, studentName, className = '' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Use the studentId directly as it should be the qrCode value
        const url = await QRCode.toDataURL(studentId, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(url)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    generateQRCode()
  }, [studentId])

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.download = `${studentName}_QR_Code.png`
      link.href = qrCodeUrl
      link.click()
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Student QR Code
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Student ID: {studentId}</p>
          <p className="text-sm text-gray-600">Name: {studentName}</p>
        </div>

        {qrCodeUrl && (
          <div className="mb-4">
            <img
              src={qrCodeUrl}
              alt={`QR Code for ${studentName}`}
              className="mx-auto border-2 border-gray-200 rounded-lg"
            />
          </div>
        )}

        <button
          onClick={downloadQRCode}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
        >
          Download QR Code
        </button>
      </div>
    </div>
  )
}

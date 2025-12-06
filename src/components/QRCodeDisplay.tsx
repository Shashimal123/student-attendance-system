'use client'

import { useState, useEffect } from 'react'
import { generateQRCodeDataURL } from '@/lib/qrCodeUtils'

interface QRCodeDisplayProps {
  studentId: string
  studentName: string
  className?: string
}

export default function QRCodeDisplay({ studentId, studentName, className = '' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (!studentId || studentId.trim() === '') {
          throw new Error('Student ID is required')
        }

        const url = await generateQRCodeDataURL(studentId, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'H'
        })
        
        setQrCodeUrl(url)
      } catch (err: any) {
        console.error('Error generating QR code:', err)
        setError(err.message || 'Failed to generate QR code')
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

  if (error) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <div className="text-center text-red-600">
          <p className="font-semibold">Error generating QR code</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
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
          <div className="mb-4 flex justify-center">
            <img
              src={qrCodeUrl}
              alt={`QR Code for ${studentName}`}
              className="mx-auto border-2 border-gray-200 rounded-lg max-w-full h-auto"
              onError={() => setError('Failed to load QR code image')}
            />
          </div>
        )}

        <button
          onClick={downloadQRCode}
          disabled={!qrCodeUrl}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download QR Code
        </button>
      </div>
    </div>
  )
}

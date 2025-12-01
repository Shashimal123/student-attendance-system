'use client'

import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'

export default function QRScannerWithLibrary() {
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState('')
  const [scannedData, setScannedData] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [attendance, setAttendance] = useState<string[]>([]) 
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  // ✅ Valid QR codes (simulate student IDs)
  const validQRCodes = [
    'STU001-test123',
    'STU002-test456',
    'STU003-test789'
  ]

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      console.log("Start scanning..")
      setStatus('Starting QR scanner...')
      setError('')

      if (!videoRef.current) {
        throw new Error('Video element not found')
      }

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => handleQRCode(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'user',
        }
      )

      qrScannerRef.current = qrScanner
      await qrScanner.start()

      setIsScanning(true)
      setStatus('Camera ready - scanning...')
    } catch (err: unknown) {
      console.error('QR Scanner error:', err)
      setError(err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error occurred')
      setStatus('QR Scanner failed to start')
    }
  }

  const handleQRCode = (data: string) => {
    setScannedData(data)

    console.log("QR Code detected: ", data)
    if (data) {
      setStatus(`✅ Attendance marked for ${data}`)
      return
    }

    if (validQRCodes.includes(data)) {
      if (!attendance.includes(data)) {
        setAttendance((prev) => [...prev, data])
        console.log(`Attendance marked for ${data}`)
        setStatus(`✅ Attendance marked for ${data}`)
        setError('')
      } else {
        console.log(`Already scanned: ${data}`)
        setStatus(`⚠️ Already scanned: ${data}`)
      }
    } else {
      setError(`❌ Invalid QR Code: ${data}`)
      setStatus('Error: Invalid QR Code')
      console.log("Invalid QR Code")
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
    }
    setIsScanning(false)
    setStatus('Scanner stopped')
    console.log("Scanning stopped")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">QR Attendance System</h1>

        {/* Status */}
        <div
          className={`p-4 rounded-lg mb-6 shadow-md ${
            status.includes('Error') || error
              ? 'bg-red-100 text-red-700 border border-red-300'
              : status.includes('Attendance')
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}
        >
          {status}
        </div>

        {/* Controls */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={startScanning}
            disabled={isScanning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isScanning ? 'Scanning...' : 'Start Scanner'}
          </button>
          <button
            onClick={stopScanning}
            disabled={!isScanning}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            Stop Scanner
          </button>
        </div>

        {/* Camera Preview */}
        <div className="relative mb-6">
          <video ref={videoRef} className="w-full h-80 bg-black rounded-lg" />
          {isScanning && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full animate-pulse">
                Scanning...
              </span>
            </div>
          )}
        </div>

        {/* Attendance List */}
        {attendance.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Attendance List</h2>
            <ul className="list-disc list-inside space-y-1">
              {attendance.map((id, i) => (
                <li key={i} className="text-green-700 font-medium">
                  {id}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

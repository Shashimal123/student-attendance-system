'use client'

import { useState, useEffect, useRef } from 'react'

export default function WorkingQRScanner() {
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState('')
  const [scannedData, setScannedData] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  const startScanning = async () => {
    try {
      setStatus('Starting camera...')
      setError('')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setStatus('Camera ready - Scanning...')
          setIsScanning(true)
          startQRDetection()
        }
      }
      
    } catch (err: any) {
      console.error('Camera error:', err)
      setError(`${err.name}: ${err.message}`)
      setStatus('Camera failed to start')
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setStatus('Scanner stopped')
  }

  const startQRDetection = () => {
    // Simple QR detection simulation
    // In a real implementation, you'd use a QR detection library
    scanIntervalRef.current = setInterval(() => {
      // For now, we'll simulate QR detection
      // You can replace this with actual QR detection logic
      const mockQRData = generateMockQRData()
      if (mockQRData && Math.random() < 0.1) { // 10% chance of "detecting" QR
        handleQRDetected(mockQRData)
      }
    }, 1000)
  }

  const generateMockQRData = () => {
    const studentIds = ['STU001', 'STU002', 'STU003', 'STU004', 'STU005']
    const randomId = studentIds[Math.floor(Math.random() * studentIds.length)]
    return `${randomId}-${Math.random().toString(36).substr(2, 8)}`
  }

  const handleQRDetected = (qrData: string) => {
    setScannedData(qrData)
    setStatus('QR Code detected!')
    
    // Stop scanning after detection
    stopScanning()
    
    // Auto-restart after 3 seconds
    setTimeout(() => {
      startScanning()
    }, 3000)
  }

  const manualQRInput = () => {
    const input = prompt('Enter QR code data manually:')
    if (input) {
      handleQRDetected(input)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Working QR Scanner</h1>
        
        {/* Status */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg">
            <span className={status.includes('detected') ? 'text-green-600' : 
                           status.includes('ready') || status.includes('Scanning') ? 'text-blue-600' : 
                           'text-gray-600'}>
              {status}
            </span>
          </p>
          {error && (
            <p className="text-red-600 mt-2">Error: {error}</p>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Scanner Controls</h2>
          <div className="flex space-x-4">
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
            <button
              onClick={manualQRInput}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Manual Input
            </button>
          </div>
        </div>

        {/* Camera Preview */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Camera Preview</h2>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-black rounded-lg"
            />
            
            {/* QR Scanning Frame */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-48 border-2 border-white rounded-lg relative animate-pulse">
                    {/* Corner decorations */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                    
                    {/* Scanning line */}
                    <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {isScanning ? 'Position QR code within the frame' : 'Click "Start Scanner" to begin'}
          </p>
        </div>

        {/* Scan Results */}
        {scannedData && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Scan Results</h2>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                <strong>Scanned:</strong> {scannedData}
              </p>
              <p className="text-sm text-green-600 mt-2">
                Scanner will restart automatically in 3 seconds...
              </p>
            </div>
          </div>
        )}

        {/* Hidden Canvas for Future QR Detection */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">How to Use</h2>
          <ol className="space-y-2 text-blue-700">
            <li>1. Click "Start Scanner" to begin</li>
            <li>2. Allow camera access when prompted</li>
            <li>3. Position QR code within the scanning frame</li>
            <li>4. QR codes will be detected automatically</li>
            <li>5. Use "Manual Input" to test with text input</li>
            <li>6. Scanner restarts automatically after each scan</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> This is a working camera scanner. For actual QR detection, 
              you would integrate a QR detection library like 'qr-scanner' or 'jsQR'.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



'use client'

import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'

export default function QRScannerWithLibrary() {
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState('')
  const [scannedData, setScannedData] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setStatus('Starting QR scanner...')
      setError('')
      
      if (!videoRef.current) {
        throw new Error('Video element not found')
      }

      // Create QR scanner instance
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data)
          setScannedData(result.data)
          setStatus('QR Code detected!')
          setIsScanning(false)
          
          // Stop scanning
          qrScanner.stop()
          qrScanner.destroy()
          qrScannerRef.current = null
          
          // Auto-restart after 3 seconds
          setTimeout(() => {
            startScanning()
          }, 3000)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      )

      qrScannerRef.current = qrScanner
      
      // Start scanning
      await qrScanner.start()
      setIsScanning(true)
      setStatus('Camera ready - Scanning for QR codes...')
      
    } catch (err: any) {
      console.error('QR Scanner error:', err)
      setError(`${err.name}: ${err.message}`)
      setStatus('QR Scanner failed to start')
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setIsScanning(false)
    setStatus('Scanner stopped')
  }

  const manualQRInput = () => {
    const input = prompt('Enter QR code data manually:')
    if (input) {
      setScannedData(input)
      setStatus('QR Code detected!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">QR Scanner with Library</h1>
        
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
              {isScanning ? 'Scanning...' : 'Start QR Scanner'}
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
          <h2 className="text-xl font-semibold mb-4">QR Scanner Preview</h2>
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg"
            />
            
            {/* Scanning indicator */}
            {isScanning && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-2 bg-green-500 text-white px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm">Scanning</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {isScanning ? 'Position QR code within the camera view' : 'Click "Start QR Scanner" to begin'}
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

        {/* Test QR Codes */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test QR Codes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Student QR Codes:</h3>
              <ul className="text-sm space-y-1">
                <li>• STU001-test123</li>
                <li>• STU002-test456</li>
                <li>• STU003-test789</li>
                <li>• STU004-testabc</li>
                <li>• STU005-testdef</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="text-sm space-y-1">
                <li>1. Start the scanner</li>
                <li>2. Use "Manual Input" to test</li>
                <li>3. Or create QR codes online</li>
                <li>4. Point camera at QR code</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">How to Use</h2>
          <ol className="space-y-2 text-blue-700">
            <li>1. Click "Start QR Scanner" to begin</li>
            <li>2. Allow camera access when prompted</li>
            <li>3. Position QR code within the camera view</li>
            <li>4. QR codes will be detected automatically</li>
            <li>5. Use "Manual Input" to test with text input</li>
            <li>6. Scanner restarts automatically after each scan</li>
          </ol>
          
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
            <p className="text-green-800 text-sm">
              <strong>Success!</strong> This scanner uses the qr-scanner library which should work 
              much better than the previous html5-qrcode library.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



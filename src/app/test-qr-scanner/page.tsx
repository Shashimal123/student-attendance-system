'use client'

import { useState, useRef, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function TestQRScannerPage() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const onScanSuccess = (decodedText: string) => {
    console.log('QR Code scanned:', decodedText)
    setResult(decodedText)
    setError('')
  }

  const onScanFailure = (error: string) => {
    console.log('QR scan failed:', error)
    setError(error)
  }

  const startScanner = () => {
    if (scannerContainerRef.current && !scannerRef.current) {
      setIsScanning(true)
      setResult('')
      setError('')
      
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      )

      scannerRef.current.render(onScanSuccess, onScanFailure)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">QR Scanner Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Scanner Controls</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={startScanner}
              disabled={isScanning}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Start Scanner
            </button>
            <button
              onClick={stopScanner}
              disabled={!isScanning}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            >
              Stop Scanner
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            Status: {isScanning ? 'Scanning...' : 'Stopped'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Scanner</h2>
          <div id="qr-reader" ref={scannerContainerRef}></div>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Scan Result:</h3>
            <p className="text-green-700 font-mono">{result}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Test Instructions:</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Click "Start Scanner" to begin scanning</li>
            <li>• Point the camera at a QR code</li>
            <li>• The scanned result will appear above</li>
            <li>• Use a student QR code (STU001, STU002, etc.) for testing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

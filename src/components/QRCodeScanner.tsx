'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import QrScanner from 'qr-scanner'

interface QRCodeScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  className?: string
}

export default function QRCodeScanner({ onScan, onError, className = '' }: QRCodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1'
      
      if (!isSecure) {
        setHasPermission(false)
        setScannerError('Camera access requires HTTPS. Please use https://localhost:3002 or enable HTTPS for camera access.')
        if (onError) {
          onError('Camera access requires HTTPS. Please use https://localhost:3002 or enable HTTPS for camera access.')
        }
        return
      }

      // Request camera permission with better error handling
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then((stream) => {
          console.log('Camera permission granted')
          setHasPermission(true)
          setIsScanning(true)
          // Stop the stream immediately as we'll start it again in the scanner
          stream.getTracks().forEach(track => track.stop())
        })
        .catch((error) => {
          console.error('Camera permission denied:', error)
          setHasPermission(false)
          
          let errorMessage = 'Camera permission is required to scan QR codes'
          if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.'
          } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera and try again.'
          } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Camera not supported in this browser. Please try Chrome, Firefox, or Edge.'
          } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is being used by another application. Please close other apps and try again.'
          }
          
          setScannerError(errorMessage)
          if (onError) {
            onError(errorMessage)
          }
        })
    } else {
      setHasPermission(false)
      setScannerError('Camera not available in this environment')
      if (onError) {
        onError('Camera not available in this environment')
      }
    }
  }, [onError])

  useEffect(() => {
    if (hasPermission && isScanning && videoRef.current && !isInitialized) {
      const initializeScanner = async () => {
        try {
          // Create QR scanner instance
          const qrScanner = new QrScanner(
            videoRef.current!,
            (result) => {
              console.log('QR Code detected:', result.data)
              onScan(result.data)
              setIsScanning(false)
              
              // Stop scanning after detection
              qrScanner.stop()
              qrScanner.destroy()
              qrScannerRef.current = null
              setIsInitialized(false)
              
              // Auto-restart after 2 seconds
              setTimeout(() => {
                if (hasPermission) {
                  setIsScanning(true)
                }
              }, 2000)
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
          setIsInitialized(true)
          console.log('QR Scanner initialized successfully')
          
        } catch (error) {
          console.error('Error initializing scanner:', error)
          setScannerError('Failed to initialize QR scanner')
          setIsScanning(false)
          if (onError) {
            onError('Failed to initialize QR scanner')
          }
        }
      }

      initializeScanner()
    }

    // Cleanup function
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }
    }
  }, [hasPermission, isScanning, isInitialized, onScan, onError])

  const handleRetry = () => {
    setScannerError(null)
    setHasPermission(null)
    setIsScanning(false)
    setIsInitialized(false)
    
    // Reset scanner
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      } catch (error) {
        console.error('Error cleaning up scanner:', error)
      }
    }

    // Re-request permission
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setHasPermission(true)
          setIsScanning(true)
        })
        .catch((error) => {
          console.error('Camera permission denied:', error)
          setHasPermission(false)
          setScannerError('Camera permission is required to scan QR codes')
        })
    }
  }

  const simulateQRScan = () => {
    // For testing purposes, simulate a QR scan
    const mockQRData = 'STU001-test123'
    onScan(mockQRData)
  }

  if (hasPermission === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center justify-center p-8 ${className}`}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">Requesting camera permission...</p>
        </div>
      </motion.div>
    )
  }

  if (hasPermission === false || scannerError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center justify-center p-8 ${className}`}
      >
        <div className="text-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="text-6xl mb-4"
          >
            📷
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Camera Permission Required
          </h3>
          <p className="text-gray-600 mb-4">
            {scannerError || 'Please allow camera access to scan QR codes'}
          </p>
          <div className="space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Retry
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={simulateQRScan}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Test Scan
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`${className}`}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            QR Code Scanner
          </h3>
          <p className="text-sm text-gray-600">
            Position the QR code within the camera view
          </p>
        </div>
        
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-black"
          />
          
          {/* Overlay with scanning frame */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-64 h-64 border-2 border-white rounded-2xl relative"
              >
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg"></div>
                
                {/* Scanning line */}
                <motion.div
                  animate={{
                    y: [0, 240, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                />
              </motion.div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-center space-x-3">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-3 h-3 bg-purple-500 rounded-full"
            />
            <span className="text-sm text-gray-600 font-medium">Scanning for QR codes...</span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="w-3 h-3 bg-pink-500 rounded-full"
            />
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={simulateQRScan}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              Test with Sample QR Code
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

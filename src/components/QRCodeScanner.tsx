'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

type QRHandler = (data: string) => void

interface QRCodeScannerProps {
  onResult?: QRHandler
  onDecode?: QRHandler
  onScan?: QRHandler
  onError?: (error: string) => void
  className?: string
  autoStart?: boolean
  preferredCamera?: 'user' | 'environment'
}

export default function QRCodeScanner({
  onResult,
  onDecode,
  onScan,
  onError,
  className = '',
  autoStart = true,
  preferredCamera = 'environment'
}: QRCodeScannerProps) {
  const [status, setStatus] = useState('Point the camera at a QR code to begin')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastScan, setLastScan] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const isMountedRef = useRef(true)

  const emitResult = useCallback((data: string) => {
    if (!isMountedRef.current) return
    onResult?.(data)
    onDecode?.(data)
    onScan?.(data)
  }, [onResult, onDecode, onScan])

  const handleScanResult = useCallback((data: string) => {
    if (!data || !isMountedRef.current) {
      return
    }

    setLastScan(data)
    setStatus('QR code detected')
    setErrorMessage('')
    emitResult(data)
  }, [emitResult])

  const startScanning = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      if (!videoRef.current) {
        throw new Error('Video element not found')
      }

      setStatus('Starting scanner...')
      setErrorMessage('')

      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.start()
          if (!isMountedRef.current) return
          setIsScanning(true)
          setStatus('Scanner running')
        } catch (err: any) {
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            return
          }
          throw err
        }
        return
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!isMountedRef.current) return
          const text = typeof result === 'string' ? result : result?.data
          if (text) {
            handleScanResult(text)
          }
        },
        {
          highlightCodeOutline: true,
          highlightScanRegion: true,
          preferredCamera
        }
      )

      qrScannerRef.current = scanner
      
      try {
        await scanner.start()
        if (!isMountedRef.current) {
          await scanner.stop()
          scanner.destroy()
          qrScannerRef.current = null
          return
        }
        setIsScanning(true)
        setStatus('Scanner running')
      } catch (err: any) {
        if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
          return
        }
        throw err
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return
      }
      if (!isMountedRef.current) return
      
      const message = error instanceof Error ? error.message : 'Unknown scanner error'
      setErrorMessage(message)
      setStatus('Unable to start scanner')
      onError?.(message)
    }
  }, [handleScanResult, onError, preferredCamera])

  const stopScanning = useCallback(async () => {
    if (!qrScannerRef.current) {
      return
    }

    try {
      await qrScannerRef.current.stop()
      if (isMountedRef.current) {
        setIsScanning(false)
        setStatus('Scanner stopped')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    if (autoStart) {
      startScanning()
    }

    return () => {
      isMountedRef.current = false
      
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop().catch((err: any) => {
            if (err.name !== 'AbortError') {
              console.error('Error stopping scanner:', err)
            }
          })
          qrScannerRef.current.destroy()
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error destroying scanner:', err)
          }
        } finally {
          qrScannerRef.current = null
        }
      }

      if (videoRef.current?.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream
          stream.getTracks().forEach(track => {
            track.stop()
          })
          videoRef.current.srcObject = null
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error cleaning up video stream:', err)
          }
        }
      }
    }
  }, [autoStart, startScanning])

  const statusStyles = useMemo(() => {
    if (errorMessage) {
      return 'bg-red-50 text-red-700 border border-red-200'
    }

    if (lastScan) {
      return 'bg-green-50 text-green-700 border border-green-200'
    }

    return 'bg-blue-50 text-blue-700 border border-blue-200'
  }, [errorMessage, lastScan])

  return (
    <div className={`space-y-4 ${className}`}>
      <div className={`p-3 rounded-xl text-sm ${statusStyles}`}>
        <p className="font-medium">{status}</p>
        {lastScan && (
          <p className="mt-1 text-xs text-green-700 break-all">
            Last scan: {lastScan}
          </p>
        )}
        {errorMessage && (
          <p className="mt-1 text-xs text-red-600">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-purple-100 bg-black">
        <video
          ref={videoRef}
          className="w-full aspect-square object-cover"
          muted
          playsInline
        />
        {isScanning && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-green-500/90 text-white text-xs rounded-full animate-pulse">
              Scanning…
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={startScanning}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold disabled:bg-gray-400 transition-colors"
          disabled={isScanning}
        >
          {isScanning ? 'Scanner Active' : 'Start Scanner'}
        </button>
        <button
          onClick={stopScanning}
          className="flex-1 bg-gray-100 text-gray-900 py-2 px-4 rounded-lg font-semibold disabled:bg-gray-200 transition-colors"
          disabled={!isScanning}
        >
          Stop
        </button>
      </div>
    </div>
  )
}

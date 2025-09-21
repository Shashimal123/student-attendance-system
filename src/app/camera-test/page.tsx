'use client'

import { useState, useEffect, useRef } from 'react'

export default function SimpleCameraTest() {
  const [status, setStatus] = useState('Checking...')
  const [error, setError] = useState('')
  const [cameraList, setCameraList] = useState<any[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    checkCameraSupport()
  }, [])

  const checkCameraSupport = async () => {
    try {
      setStatus('Checking browser support...')
      
      // Check basic support
      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices not supported')
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported')
      }

      setStatus('Getting camera list...')
      
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      console.log('Available cameras:', videoDevices)
      setCameraList(videoDevices)
      
      if (videoDevices.length === 0) {
        throw new Error('No cameras found')
      }

      setStatus('Testing camera access...')
      
      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      })
      
      setStatus('Camera access successful!')
      
      // Show camera feed
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
    } catch (err: any) {
      console.error('Camera error:', err)
      setError(`${err.name}: ${err.message}`)
      setStatus('Camera access failed')
    }
  }

  const testSpecificCamera = async (deviceId: string) => {
    try {
      setStatus(`Testing camera: ${deviceId}`)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setStatus('Camera working!')
      setError('')
      
    } catch (err: any) {
      console.error('Camera test error:', err)
      setError(`${err.name}: ${err.message}`)
      setStatus('Camera test failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Camera Test</h1>
        
        {/* Status */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg">
            <span className={status.includes('successful') || status.includes('working') ? 'text-green-600' : 'text-blue-600'}>
              {status}
            </span>
          </p>
          {error && (
            <p className="text-red-600 mt-2">Error: {error}</p>
          )}
        </div>

        {/* Camera List */}
        {cameraList.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Available Cameras</h2>
            <div className="space-y-2">
              {cameraList.map((camera, index) => (
                <div key={camera.deviceId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{camera.label || `Camera ${index + 1}`}</p>
                    <p className="text-sm text-gray-600">ID: {camera.deviceId}</p>
                  </div>
                  <button
                    onClick={() => testSpecificCamera(camera.deviceId)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Camera Preview */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Camera Preview</h2>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-black"
            />
          </div>
        </div>

        {/* Browser Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Browser Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User Agent:</strong><br />
              <span className="text-gray-600">{typeof window !== 'undefined' ? navigator.userAgent : 'Loading...'}</span>
            </div>
            <div>
              <strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'Loading...'}<br />
              <strong>Hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Loading...'}<br />
              <strong>Port:</strong> {typeof window !== 'undefined' ? window.location.port : 'Loading...'}
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Troubleshooting Steps</h2>
          <ol className="space-y-2 text-yellow-700">
            <li>1. <strong>Check camera permissions</strong> - Look for camera icon in browser address bar</li>
            <li>2. <strong>Close other apps</strong> - Make sure no other app is using the camera</li>
            <li>3. <strong>Try different camera</strong> - Click "Test" on different cameras above</li>
            <li>4. <strong>Check browser settings</strong> - Go to browser settings and check camera permissions</li>
            <li>5. <strong>Restart browser</strong> - Close browser completely and reopen</li>
            <li>6. <strong>Try incognito mode</strong> - Test in private/incognito window</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

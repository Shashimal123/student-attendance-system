'use client'

import { useState, useEffect } from 'react'

export default function QRDebugPage() {
  const [cameraInfo, setCameraInfo] = useState<any>(null)
  const [permissions, setPermissions] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    checkCameraSupport()
  }, [])

  const checkCameraSupport = async () => {
    const info: any = {
      userAgent: navigator.userAgent,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      isSecure: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    }

    setCameraInfo(info)

    // Check camera permissions
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setPermissions({
          state: permission.state,
          canQuery: true
        })
      } else {
        setPermissions({
          state: 'unknown',
          canQuery: false
        })
      }
    } catch (error) {
      setPermissions({
        state: 'error',
        error: error.message
      })
    }

    // Test camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setErrors(prev => [...prev, '✅ Camera access successful'])
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      setErrors(prev => [...prev, `❌ Camera access failed: ${error.name} - ${error.message}`])
    }
  }

  const testCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      // Create video element to show camera feed
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()
      
      // Add video to page
      const container = document.getElementById('camera-preview')
      if (container) {
        container.innerHTML = ''
        container.appendChild(video)
        video.style.width = '100%'
        video.style.height = '300px'
        video.style.objectFit = 'cover'
      }
      
      setErrors(prev => [...prev, '✅ Camera preview started'])
      
      // Stop after 10 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop())
        if (container) {
          container.innerHTML = '<p>Camera preview stopped</p>'
        }
      }, 10000)
      
    } catch (error: any) {
      setErrors(prev => [...prev, `❌ Camera test failed: ${error.name} - ${error.message}`])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">QR Scanner Debug Page</h1>
        
        {/* Camera Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Camera Support Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameraInfo && Object.entries(cameraInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span className={typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}>
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Camera Permissions</h2>
          {permissions && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Permission State:</span>
                <span className={permissions.state === 'granted' ? 'text-green-600' : 'text-red-600'}>
                  {permissions.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Can Query Permissions:</span>
                <span className={permissions.canQuery ? 'text-green-600' : 'text-red-600'}>
                  {permissions.canQuery ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Camera Test</h2>
          <button
            onClick={testCameraAccess}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mb-4"
          >
            Test Camera Access
          </button>
          <div id="camera-preview" className="border border-gray-300 rounded-lg p-4 min-h-[200px] bg-gray-100">
            <p className="text-gray-500">Click "Test Camera Access" to see camera preview</p>
          </div>
        </div>

        {/* Errors */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded">
                {error}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Troubleshooting Recommendations</h2>
          <ul className="space-y-2 text-yellow-700">
            <li>• <strong>HTTPS Required:</strong> Camera access requires HTTPS. Use https://localhost:3002</li>
            <li>• <strong>Browser Permissions:</strong> Make sure to allow camera access when prompted</li>
            <li>• <strong>Camera Usage:</strong> Close other applications that might be using the camera</li>
            <li>• <strong>Browser Compatibility:</strong> Use Chrome, Firefox, or Edge for best results</li>
            <li>• <strong>Mobile Testing:</strong> Try testing on a mobile device for better camera access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}


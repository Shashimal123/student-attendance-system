'use client'

import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

type AttemptResult = {
  deviceId?: string | null
  ok: boolean
  reason?: string
}

export default function QRScannerAutoTry() {
  const [status, setStatus] = useState('Idle')
  const [logs, setLogs] = useState<string[]>([])
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopAll()
    }
  }, [])

  // logging helpers
  const appendLog = (m: string) => {
    console.log(m)
    setLogs((s) => [new Date().toLocaleTimeString() + ' — ' + m, ...s].slice(0, 50))
  }

  const stopAll = () => {
    appendLog('stopAll — cleaning up')
    if (qrScannerRef.current) {
      try { qrScannerRef.current.stop(); qrScannerRef.current.destroy() } catch {}
      qrScannerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch {}
    }
    setIsScanning(false)
    setStatus('Stopped')
  }

  // minimal permission-get to allow device labels (not necessary but helpful)
  const ensureLabels = async () => {
    try {
      appendLog('Requesting minimal permission to reveal labels (if needed)')
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      s.getTracks().forEach((t) => t.stop())
    } catch (err) {
      appendLog('Permission hint failed (user may deny). Continuing to enumerate anyway.')
    }
  }

  const enumerate = async () => {
    try {
      await ensureLabels()
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      setCameras(videoDevices)
      appendLog(`enumerateDevices found ${videoDevices.length} video input(s)`)
    } catch (err) {
      appendLog('enumerateDevices error: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Try to attach a stream for a specific constraint (deviceId or facingMode)
  const tryStream = async (constraints: MediaStreamConstraints, attemptLabel: string, timeoutMs = 4000): Promise<AttemptResult> => {
    appendLog(`Attempting stream: ${attemptLabel}`)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      appendLog(`Got stream, tracks: ${stream.getVideoTracks().map(t => t.label || t.id).join(', ')}`)
      // attach
      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return { ok: false, reason: 'no video element' }
      }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.muted = true
      videoRef.current.playsInline = true
      try { (videoRef.current as any).webkitPlaysInline = true } catch {}
      // Wait for video to start playing or timeout
      const playPromise = (async () => {
        try {
          await videoRef.current!.play()
        } catch (err) {
          // play may reject due to autoplay policy; but we still check loadedmetadata/onplaying
          appendLog('video.play() rejected or blocked — will wait for events')
        }
      })()

      const waiting = new Promise<AttemptResult>((resolve) => {
        let done = false
        const cleanup = () => {
          if (done) return
          done = true
          videoRef.current?.removeEventListener('playing', onPlaying)
          videoRef.current?.removeEventListener('loadeddata', onLoadedData)
          clearTimeout(timer)
        }
        const onPlaying = () => {
          cleanup()
          appendLog('Video playing event fired')
          resolve({ ok: true })
        }
        const onLoadedData = () => {
          // some browsers fire loadeddata before playing
          const hasSize = (videoRef.current?.videoWidth || 0) > 0
          appendLog(`loadeddata fired, size ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`)
          if (hasSize) {
            cleanup()
            resolve({ ok: true })
          }
        }
        videoRef.current?.addEventListener('playing', onPlaying)
        videoRef.current?.addEventListener('loadeddata', onLoadedData)
        const timer = window.setTimeout(() => {
          cleanup()
          resolve({ ok: false, reason: 'timeout waiting for video frames' })
        }, timeoutMs)
      })

      // Wait for either play to progress/waiting promise
      const r = await waiting
      if (r.ok) {
        appendLog('Video appears to be rendering frames')
        return { ok: true }
      } else {
        // draw snapshot for debug if possible
        try {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = 320
            canvasRef.current.height = 240
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, 320, 240)
              appendLog('Drew snapshot to canvas for debug')
            }
          }
        } catch (err) {
          appendLog('Snapshot draw failed: ' + (err instanceof Error ? err.message : String(err)))
        }
        // Stop tracks before returning
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        return { ok: false, reason: r.reason }
      }
    } catch (err: unknown) {
      appendLog('getUserMedia failed: ' + (err instanceof Error ? err.message : String(err)))
      return { ok: false, reason: err instanceof Error ? err.message : String(err) }
    }
  }

  // Try all cameras sequentially (preferred). If none works, try facingMode fallback
  const tryAllCameras = async () => {
    setLogs([])
    setScannedData(null)
    setStatus('Trying cameras...')
    appendLog('Starting auto camera attempts')
    stopAll()
    try {
      await enumerate()
      // if no cameras found, try facingMode directly
      if (cameras.length === 0) {
        appendLog('No camera devices found — trying facingMode fallback')
        const res = await tryStream({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } }, 'facingMode fallback', 5000)
        if (res.ok) {
          appendLog('Fallback video working')
          onVideoReadyAndStartScanner()
          return
        } else {
          setStatus('No usable camera found')
          appendLog('FacingMode fallback failed: ' + (res.reason ?? 'unknown'))
          return
        }
      }

      // try each camera deviceId
      for (const cam of cameras) {
        if (!mountedRef.current) return
        appendLog(`Trying device: ${cam.deviceId} (${cam.label || 'no-label'})`)
        const res = await tryStream({ video: { deviceId: { exact: cam.deviceId }, width: { ideal: 1280 } } }, `device ${cam.deviceId}`, 4500)
        if (res.ok) {
          appendLog(`Device ${cam.deviceId} worked`)
          onVideoReadyAndStartScanner()
          return
        } else {
          appendLog(`Device ${cam.deviceId} failed: ${res.reason}`)
        }
      }

      // if none worked, try facingMode
      appendLog('All deviceId attempts failed — trying facingMode fallback')
      const r2 = await tryStream({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } }, 'facingMode (last attempt)', 5000)
      if (r2.ok) {
        appendLog('FacingMode fallback worked')
        onVideoReadyAndStartScanner()
      } else {
        appendLog('FacingMode fallback failed: ' + (r2.reason ?? 'unknown'))
        setStatus('No camera produced frames — check permissions/HTTPS/other app using camera')
      }
    } catch (err) {
      appendLog('tryAllCameras error: ' + (err instanceof Error ? err.message : String(err)))
      setStatus('Error during camera attempts')
    }
  }

  // Called when video is confirmed to be rendering frames
  const onVideoReadyAndStartScanner = () => {
    setStatus('Video streaming — starting QR scanner')
    appendLog('Attaching qr-scanner now')
    if (!videoRef.current) return
    // start qr scanner
    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          const data = (result as any)?.data ?? String(result)
          appendLog('QR detected: ' + data)
          setScannedData(data)
          setStatus('QR detected')
          // stop scanner and stream but do not auto-restart automatically here
          try { qrScanner.stop(); qrScanner.destroy() } catch {}
          qrScannerRef.current = null
          stopAll()
        },
        { highlightScanRegion: true, highlightCodeOutline: true }
      )
      qrScannerRef.current = qrScanner
      qrScanner.start().then(() => {
        setIsScanning(true)
        setStatus('Scanning for QR codes...')
        appendLog('qr-scanner started')
      }).catch((e) => {
        appendLog('qr-scanner.start() error: ' + (e instanceof Error ? e.message : String(e)))
      })
    } catch (err) {
      appendLog('Failed to attach qr-scanner: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Manual stop
  const handleStop = () => {
    stopAll()
    setStatus('Stopped by user')
  }

  // UI and quick checklist included below
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">QR Scanner — automatic camera trials</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={tryAllCameras} className="bg-indigo-600 text-white px-4 py-2 rounded">Try all cameras</button>
        <button onClick={enumerate} className="bg-gray-200 px-3 py-2 rounded">Detect cameras</button>
        <button onClick={handleStop} className="bg-red-600 text-white px-3 py-2 rounded">Stop</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="font-semibold mb-2">Camera preview</div>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full bg-black rounded"
            style={{ height: 360, objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} className="mt-2 border" style={{ width: 320, height: 240 }} />
          <div className="mt-2 text-sm text-gray-600">
            <strong>Status:</strong> {status}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            If video remains black after "Try all cameras": check (1) HTTPS or localhost, (2) browser camera permission for this site, (3) other apps using camera, (4) try another browser.
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="font-semibold mb-2">Debug logs</div>
          <div className="text-xs h-80 overflow-auto bg-gray-50 p-2 rounded">
            {logs.length === 0 ? <div className="text-gray-400">No logs yet</div> :
              logs.map((l, i) => <div key={i} className="pb-1 border-b last:border-b-0">{l}</div>)
            }
          </div>

          <div className="mt-4 text-sm">
            <div><strong>Detected cameras:</strong> {cameras.length}</div>
            <div className="break-words"><strong>Last scanned:</strong> {scannedData ?? '-'}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
        Quick checklist:
        <ol className="ml-4 list-decimal mt-1">
          <li>Run on <strong>https://</strong> or <strong>http://localhost</strong>.</li>
          <li>Allow camera access when browser prompt appears (check site settings if denied).</li>
          <li>Close other apps (Zoom, Teams) that may be using the camera.</li>
          <li>Try another browser (Chrome/Edge/Firefox). Safari often needs explicit inline attribute (handled).</li>
          <li>If still failing, paste the <em>top 5</em> logs from the Debug logs pane here and tell me your OS & browser version.</li>
        </ol>
      </div>
    </div>
  )
}

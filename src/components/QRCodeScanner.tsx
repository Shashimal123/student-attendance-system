'use client'

import React, { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  courseId?: string | null // pass selected course id or code from parent
  markedBy?: string | null // optional teacher id (from session)
  className?: string
}

type CourseItem = { id: string | number; code?: string; name?: string }

export default function QRScannerWithAPI({ courseId: initialCourseId = null, markedBy = null, className = '' }: Props) {
  const { user } = useAuth()
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [attendance, setAttendance] = useState<string[]>([])
  const [debugLastScanned, setDebugLastScanned] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(initialCourseId)
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const cooldownRef = useRef(false)
  const resumeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      try {
        qrScannerRef.current?.stop()
        qrScannerRef.current?.destroy()
      } catch (e) {
        console.warn('cleanup scanner', e)
      }
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current)
      }
    }
  }, [])

  // fetch courses if endpoint exists; non-blocking and safe fallback
  useEffect(() => {
    let mounted = true
    const fetchCourses = async () => {
      if (!user) {
        setLoadingCourses(false)
        return
      }

      setLoadingCourses(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('No authentication token found')
          setLoadingCourses(false)
          return
        }

        const res = await fetch('/api/courses', { 
          method: 'GET', 
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!mounted) return
        if (!res.ok) {
          console.warn('Failed to fetch courses:', res.status, res.statusText)
          setLoadingCourses(false)
          return
        }
        const json = await res.json().catch(() => null)
        if (!json) {
          console.warn('Invalid JSON response from courses API')
          setLoadingCourses(false)
          return
        }
        // expect array of { id, code, name } or similar
        if (Array.isArray(json)) {
          const mapped = json.map((c: { id?: string | number; courseId?: string; code?: string; courseCode?: string; name?: string; title?: string }) => ({
            id: c.id ?? c.courseId ?? c.code ?? String(c).slice(0, 8),
            code: c.code ?? c.courseCode ?? undefined,
            name: c.name ?? c.title ?? undefined
          }))
          setCourses(mapped)
          // if no initial course and one course exists, default to first
          if (!initialCourseId && mapped.length > 0 && !courseId) {
            const idOrCode = mapped[0].code ?? String(mapped[0].id)
            setCourseId(String(idOrCode))
          }
        } else {
          console.warn('Courses API returned non-array response:', json)
        }
      } catch (e) {
        // ignore errors; leave courses empty so manual input remains available
        console.warn('Could not fetch courses (ignored)', e)
      } finally {
        if (mounted) setLoadingCourses(false)
      }
    }

    fetchCourses()
    return () => {
      mounted = false
    }
  }, [user, initialCourseId, courseId])

  // Helper: parse the scanned payload into a studentId
  const parseStudentId = (raw: string): string | null => {
    if (!raw) return null
    setDebugLastScanned(raw)
    raw = raw.trim()

    // If JSON with studentId
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.studentId && typeof parsed.studentId === 'string') return parsed.studentId
      } catch {
        // ignore
      }
    }

    // If URL-like, try last path segment
    try {
      if (raw.startsWith('http')) {
        const u = new URL(raw)
        const seg = u.pathname.split('/').filter(Boolean).pop()
        if (seg) raw = seg
      }
    } catch {
      // ignore
    }

    // If contains '-' (e.g. STU001-test123), take prefix before first '-'
    if (raw.includes('-')) return raw.split('-')[0]

    // If the token looks like STUxxx, accept as-is
    if (/^STU\d+/i.test(raw)) return raw

    // fallback: return raw if short-ish
    if (raw.length > 0 && raw.length < 50) return raw

    return null
  }

  // UI helper functions
  const showError = (msg: string) => {
    setError(msg)
    setStatus('Error: ' + msg)
  }
  const showSuccess = (msg: string) => {
    setError(null)
    setStatus(msg)
  }

  // Call attendance API
  const markAttendance = async (studentId: string) => {
    if (!courseId) {
      showError('Please select a course before scanning.')
      return { ok: false, msg: 'No course selected' }
    }

    if (!user) {
      showError('Please login to mark attendance.')
      return { ok: false, msg: 'Not authenticated' }
    }

    const token = localStorage.getItem('token')
    if (!token) {
      showError('Authentication token not found. Please login again.')
      return { ok: false, msg: 'No authentication token' }
    }

    const payload = { studentId, courseId, status: 'PRESENT', markedBy: markedBy || user.teacherId || user.adminId }

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.success === false) {
        const message = json?.message || `Server returned ${res.status}`
        return { ok: false, msg: message, code: json?.code ?? null }
      }
      return { ok: true, msg: json.message || 'Attendance marked', data: json }
    } catch (err) {
      console.error('markAttendance network error', err)
      return { ok: false, msg: 'Network error while marking attendance' }
    }
  }

  // scanner callback
  const onDetected = async (raw: string) => {
    // debounce duplicates
    if (cooldownRef.current) {
      console.log('ignoring duplicate during cooldown', raw)
      return
    }
    cooldownRef.current = true

    const studentId = parseStudentId(raw)
    if (!studentId) {
      showError('Invalid QR format. Scanned: ' + raw.slice(0, 80))
    } else {
      setDebugLastScanned(studentId)
      setStatus('Checking ' + studentId + '...')
      // Pause scanner to avoid duplicate network calls, keep video alive
      try { qrScannerRef.current?.pause() } catch (e) { console.warn('pause failed', e) }
      setIsScanning(false)

      const result = await markAttendance(studentId)
      if (result.ok) {
        showSuccess(`✅ Attendance marked for ${studentId}`)
        // add to attendance list (prevent duplicates)
        setAttendance(prev => prev.includes(studentId) ? prev : [...prev, studentId])
      } else {
        // show server-provided message if available
        showError(`❌ ${result.msg}`)
      }
    }

    // resume after cooldown (3s)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = window.setTimeout(async () => {
        try {
          // QrScanner doesn't have resume method, use start instead
          await qrScannerRef.current?.start()
          setIsScanning(true)
          setStatus('Camera ready - scanning...')
        } catch (err) {
        console.warn('resume failed, trying start()', err)
        try {
          await qrScannerRef.current?.start()
          setIsScanning(true)
          setStatus('Camera ready - scanning...')
        } catch {
          showError('Unable to resume scanner')
        }
      } finally {
        cooldownRef.current = false
      }
    }, 3000)
  }

  const startScanner = async () => {
    setError(null)
    setStatus('Starting scanner...')
    if (!videoRef.current) {
      showError('Video element not found')
      return
    }

    // create or reuse
    if (!qrScannerRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('qr detected raw:', result?.data)
          onDetected(String(result?.data))
        },
        { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'user' }
      )
    }

    try {
      await qrScannerRef.current.start()
      setIsScanning(true)
      setStatus('Camera ready - scanning...')
    } catch (err) {
      console.error('start scanner error', err)
      showError('Failed to start camera. Check permissions and HTTPS.')
    }
  }

  const stopScanner = () => {
    try {
      qrScannerRef.current?.stop()
    } catch (e) { console.warn('stop error', e) }
    setIsScanning(false)
    setStatus('Scanner stopped')
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className={className}>
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="font-semibold text-lg mb-2">QR Code Scanner</h3>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">Please login to use the QR scanner.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="bg-white p-6 rounded shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">QR Code Scanner</h3>
          <div className="text-xs text-gray-500">
            Logged in as: {user.role} ({user.email})
          </div>
        </div>

        {/* Course selection - enhanced with search */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">Selected Course</label>

          {loadingCourses ? (
            <div className="px-3 py-2 border rounded bg-gray-50 text-sm text-gray-500">Loading courses...</div>
          ) : courses.length > 0 ? (
            <div className="space-y-2">
              {/* Search input */}
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
                disabled={!!initialCourseId}
              />
              
              {/* Course dropdown */}
              <select
                value={courseId ?? ''}
                onChange={(e) => {
                  const selectedCourseId = e.target.value || null
                  setCourseId(selectedCourseId)
                  // Clear error when course is selected
                  if (selectedCourseId) {
                    setError(null)
                    setStatus('Course selected: ' + (courses.find(c => (c.code ?? String(c.id)) === selectedCourseId)?.name || selectedCourseId))
                  }
                }}
                className="w-full border px-3 py-2 rounded"
                disabled={!!initialCourseId}
              >
                <option value="">{initialCourseId ? initialCourseId : 'Select a course'}</option>
                {courses
                  .filter(c => {
                    if (!searchTerm) return true
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      c.name?.toLowerCase().includes(searchLower) ||
                      c.code?.toLowerCase().includes(searchLower) ||
                      String(c.id).toLowerCase().includes(searchLower)
                    )
                  })
                  .map((c) => {
                    const label = c.name ? `${c.name} (${c.code ?? c.id})` : `${c.code ?? c.id}`
                    const value = c.code ?? String(c.id)
                    return (
                      <option key={String(c.id)} value={value}>
                        {label}
                      </option>
                    )
                  })}
              </select>
              
              {/* Quick course buttons */}
              <div className="flex flex-wrap gap-1">
                {courses
                  .filter(c => {
                    if (!searchTerm) return false
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      c.name?.toLowerCase().includes(searchLower) ||
                      c.code?.toLowerCase().includes(searchLower) ||
                      String(c.id).toLowerCase().includes(searchLower)
                    )
                  })
                  .slice(0, 3) // Show max 3 quick options
                  .map((c) => {
                    const value = c.code ?? String(c.id)
                    const isSelected = courseId === value
                    return (
                      <button
                        key={String(c.id)}
                        onClick={() => {
                          setCourseId(value)
                          setError(null)
                          setStatus('Course selected: ' + (c.name || value))
                        }}
                        className={`px-2 py-1 text-xs rounded border ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-300 text-blue-700' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={!!initialCourseId}
                      >
                        {c.code ?? c.id}
                      </button>
                    )
                  })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={courseId ?? ''}
                onChange={(e) => {
                  const selectedCourseId = e.target.value || null
                  setCourseId(selectedCourseId)
                  // Clear error when course is entered
                  if (selectedCourseId) {
                    setError(null)
                    setStatus('Course entered: ' + selectedCourseId)
                  }
                }}
                placeholder="Enter course id or code (e.g. MATH101)"
                className="w-full border px-3 py-2 rounded"
                readOnly={!!initialCourseId}
              />
              <div className="text-xs text-gray-500">
                No courses found — enter course code or DB id manually
              </div>
            </div>
          )}

          {/* Current selection display */}
          {courseId && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <span className="text-green-700">✓ Selected: </span>
              <span className="font-medium">
                {courses.find(c => (c.code ?? String(c.id)) === courseId)?.name || courseId}
              </span>
            </div>
          )}
        </div>

        {/* Status / messages */}
        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">{status}</div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <button onClick={startScanner} disabled={isScanning} className="bg-blue-600 text-white px-4 py-2 rounded">Start Scanner</button>
          <button onClick={stopScanner} disabled={!isScanning} className="bg-red-600 text-white px-4 py-2 rounded">Stop Scanner</button>
        </div>

        {/* Video */}
        <div className="bg-black rounded overflow-hidden mb-3" style={{ height: 360 }}>
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        </div>

        {/* Debug last scanned */}
        <div className="text-xs text-gray-500 mb-3">
          <div>Last raw scanned: <strong>{debugLastScanned ?? '-'}</strong></div>
          <div>Marked items: {attendance.length}</div>
        </div>

        {/* Attendance list */}
        {attendance.length > 0 && (
          <div className="bg-green-50 border border-green-100 p-3 rounded">
            <strong>Marked attendance:</strong>
            <ul className="list-disc list-inside mt-2">
              {attendance.map((s) => <li key={s} className="text-green-800">{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export interface SaveAttendanceRequest {
  studentId: string
  courseId: string
  status: 'PRESENT' | 'LATE' | 'ABSENT'
  remarks?: string
  latePayment?: boolean
  token: string
}

export interface SaveAttendanceResponse {
  success: boolean
  alreadyMarked?: boolean
  message?: string
  error?: string
}

// FIX: unified save function
export async function saveAttendance({
  studentId,
  courseId,
  status,
  remarks,
  latePayment,
  token
}: SaveAttendanceRequest): Promise<SaveAttendanceResponse> {
  const response = await fetch('/api/attendance/mark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      studentId,
      courseId,
      status,
      remarks,
      latePayment
    })
  })

  const data = await response.json()
  return data
}


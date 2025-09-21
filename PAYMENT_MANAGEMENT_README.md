# Payment Management Module

## Overview

The Payment Management module is a comprehensive system for managing student payments, tracking grace periods, and calculating teacher payouts in the Student Attendance Management System.

## Features

### 1. Grace Period & Attendance Restriction
- **2-Week Grace Period**: Students get a 2-week grace period after the due date
- **Smart Attendance Control**: 
  - Week 1-2: Attendance allowed with payment warning
  - Week 3+: Attendance blocked until payment is made
- **Automatic Status Updates**: Payment status automatically updates based on dates

### 2. Manual Payment Registration
- **No Online Gateway**: Budget-friendly manual payment system
- **Multiple Payment Methods**: Cash, Card, Bank Transfer, Mobile Payment, Other
- **Course-Wise Payments**: Each payment is linked to specific courses
- **Admin/Staff Control**: Authorized personnel can mark payments as completed

### 3. Teacher Payment Calculation
- **Automatic Calculation**: 70% teacher share, 30% institute share
- **Monthly Reports**: End-of-month payout calculations
- **Comprehensive Reports**: Total collections, teacher payouts, institute balance

### 4. Dashboard Features
- **Tabbed Interface**: Pending Payments, Payment Registration, Reports
- **Real-time Statistics**: Total collected, pending, grace period, overdue amounts
- **Payment Registration Modal**: Easy-to-use form for manual payments
- **Teacher Payout Reports**: Monthly breakdown of collections and payouts

## Database Schema

### Payment Model
```prisma
model Payment {
  id              String        @id @default(cuid())
  studentId       String
  courseId        String
  amount          Float
  month           Int           // 1-12
  year            Int
  status          PaymentStatus @default(PENDING)
  dueDate         DateTime
  paidDate        DateTime?
  paymentMethod   PaymentMethod?
  reference       String?       // Transaction ID, Receipt number
  gracePeriodStart DateTime?    // When grace period started
  gracePeriodEnd   DateTime?    // When grace period ends (2 weeks from due)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  student         Student       @relation(fields: [studentId], references: [id])
  course          Course        @relation(fields: [courseId], references: [id])

  @@unique([studentId, courseId, month, year])
}
```

### TeacherPayout Model
```prisma
model TeacherPayout {
  id              String   @id @default(cuid())
  teacherId       String
  courseId        String
  month           Int      // 1-12
  year            Int
  totalCollected  Float    // Total fees collected for this course/month
  teacherShare    Float    // 70% of total collected
  instituteShare  Float    // 30% of total collected
  payoutDate      DateTime?
  status          String   @default("PENDING") // PENDING, PAID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  teacher         Teacher  @relation(fields: [teacherId], references: [id])
  course          Course   @relation(fields: [courseId], references: [id])

  @@unique([teacherId, courseId, month, year])
}
```

## API Endpoints

### 1. Payment Management (`/api/admin/payments`)
- **GET**: Fetch all payments with filtering options
- **POST**: Create or update payment records
- **Features**: 
  - Filter by month, year, status, student
  - Automatic grace period calculation
  - Payment status determination
  - Student notifications

### 2. Teacher Payouts (`/api/admin/payments/teacher-payouts`)
- **GET**: Fetch teacher payout reports
- **POST**: Generate monthly teacher payouts
- **Features**:
  - Automatic 70/30 split calculation
  - Course-wise aggregation
  - Monthly report generation

### 3. Payment Status Check (`/api/attendance/check-payment`)
- **POST**: Check payment status during QR scanning
- **Features**:
  - Real-time payment validation
  - Attendance permission control
  - Automatic payment record creation

## Usage Examples

### 1. Register a Payment
```javascript
const response = await fetch('/api/admin/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    studentId: 'STU001',
    courseId: 'MATH101',
    amount: 150.00,
    paymentMethod: 'CASH',
    reference: 'REC001',
    month: 9,
    year: 2024,
    status: 'PAID',
    isManualRegistration: true
  })
})
```

### 2. Generate Teacher Payouts
```javascript
const response = await fetch('/api/admin/payments/teacher-payouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    month: 8,
    year: 2024
  })
})
```

### 3. Check Payment Status During QR Scan
```javascript
const response = await fetch('/api/attendance/check-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    studentId: 'STU001',
    courseId: 'MATH101'
  })
})

const data = await response.json()
if (!data.canAttend) {
  // Block attendance
  console.log('Attendance blocked:', data.message)
}
```

## Payment Status Flow

1. **PENDING**: Payment is due but not yet overdue
2. **GRACE_PERIOD**: Payment is overdue but within 2-week grace period
3. **OVERDUE**: Payment is more than 2 weeks overdue
4. **PAID**: Payment has been completed

## Grace Period Logic

- **Due Date**: 15th of each month
- **Grace Period**: 2 weeks from due date
- **Attendance Control**:
  - PENDING: ✅ Attendance allowed
  - GRACE_PERIOD: ✅ Attendance allowed + warning
  - OVERDUE: ❌ Attendance blocked
  - PAID: ✅ Attendance allowed

## Teacher Payout Calculation

For each course in a given month:
1. **Total Collected**: Sum of all PAID payments
2. **Teacher Share**: 70% of total collected
3. **Institute Share**: 30% of total collected

Example:
- Course: Mathematics 101
- Month: August 2024
- Total Collected: $1,500
- Teacher Share: $1,050 (70%)
- Institute Share: $450 (30%)

## Test Data

The system includes comprehensive test data:
- **Admin**: admin@test.com / password123
- **Teacher**: teacher@test.com / password123
- **Students**: student1@test.com to student5@test.com / password123
- **Courses**: Mathematics 101 ($150), Physics 101 ($200)
- **Payment Statuses**: PAID, PENDING, GRACE_PERIOD, OVERDUE, No Record

## Security Features

- **Role-based Access**: Only admins can access payment management
- **Authentication Required**: All endpoints require valid JWT tokens
- **Data Validation**: Comprehensive input validation
- **Audit Trail**: All payment changes are logged with timestamps

## Future Enhancements

1. **Export Features**: PDF/Excel report export
2. **Email Notifications**: Automated payment reminders
3. **Payment History**: Detailed payment tracking
4. **Bulk Operations**: Mass payment registration
5. **Advanced Reporting**: Custom date range reports

## Installation

1. Run database migrations:
```bash
npx prisma migrate dev
```

2. Generate test data:
```bash
node scripts/create-payment-test-data.js
```

3. Start the development server:
```bash
npm run dev
```

## Access

- **Admin Dashboard**: `/admin/payments`
- **Teacher Attendance**: `/teacher/attendance` (with payment checking)
- **API Documentation**: Available in the codebase

The Payment Management module provides a robust, scalable solution for managing student payments while maintaining the integrity of the attendance system through intelligent grace period management.


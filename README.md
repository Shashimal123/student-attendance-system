# Student Attendance System

A comprehensive student attendance tracking system built with Next.js, Prisma, and SQLite.

## Features

### Admin Features
- **Student Management**: Add, edit, and manage student records
- **Teacher Management**: Create and manage teacher accounts
- **Course Management**: Create and assign courses to teachers
- **Attendance Reports**: View and export attendance data
- **Payment Management**: Track student payments and fees
- **System Settings**: Configure system parameters
- **QR Code Generation**: Generate QR codes for students

### Teacher Features
- **Attendance Marking**: Scan QR codes to mark attendance
- **Student Viewing**: View enrolled students and their records
- **Reports**: Generate attendance reports

### Student Features
- **Profile Management**: View and update profile information
- **Course Enrollment**: Enroll in available courses
- **Attendance Tracking**: View personal attendance records
- **Payment History**: Track payment status
- **QR Code Access**: View personal QR code for attendance
- **Notifications**: Receive important updates

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT tokens
- **QR Code**: html5-qrcode for scanning, qrcode for generation
- **Email**: Nodemailer for notifications
- **PDF Generation**: jsPDF for reports

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-attendance-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   JWT_SECRET=your-secret-key-here
   DATABASE_URL="file:./dev.db"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Create default admin user**
   ```bash
   node scripts/check-db.js
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login Credentials

- **Admin**: admin@example.com / admin123
- **Teacher**: (Create through admin panel)
- **Student**: (Create through admin panel)

## System Architecture

### Database Schema

The system uses the following main entities:

- **Users**: Authentication and role management
- **Students**: Student profiles with QR codes
- **Teachers**: Teacher profiles and course assignments
- **Courses**: Course offerings with fees and duration
- **Attendance**: Daily attendance records
- **Payments**: Student payment tracking
- **Notifications**: System notifications for students

### API Structure

- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin-only endpoints
- `/api/teacher/*` - Teacher endpoints
- `/api/student/*` - Student endpoints

### Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Secure password hashing with bcrypt
- Protected API routes

## Usage Guide

### For Administrators

1. **Login** with admin credentials
2. **Add Teachers**: Go to "Manage Teachers" and create teacher accounts
3. **Add Students**: Go to "Manage Students" and create student records
4. **Create Courses**: Go to "Manage Courses" and set up course offerings
5. **Assign Teachers**: Assign teachers to courses
6. **Monitor Attendance**: View attendance reports and analytics
7. **Track Payments**: Monitor student payment status

### For Teachers

1. **Login** with teacher credentials
2. **Mark Attendance**: Use QR scanner to mark student attendance
3. **View Students**: Access student lists and records
4. **Generate Reports**: Create attendance reports for courses

### For Students

1. **Login** with student credentials
2. **View Profile**: Check and update personal information
3. **Enroll in Courses**: Browse and enroll in available courses
4. **Check Attendance**: View personal attendance records
5. **Access QR Code**: Use QR code for attendance marking
6. **Track Payments**: Monitor payment status and history

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure SQLite is properly installed
   - Check database file permissions
   - Run `npx prisma db push` to sync schema

2. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT_SECRET environment variable
   - Verify user credentials in database

3. **QR Code Issues**
   - Ensure camera permissions are granted
   - Check browser compatibility
   - Verify QR code generation

4. **API Errors**
   - Check server logs for detailed error messages
   - Verify API route permissions
   - Ensure proper authentication headers

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
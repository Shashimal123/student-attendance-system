const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n')
  
  try {
    // Check if database file exists
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
    const dbExists = fs.existsSync(dbPath)
    
    console.log('📁 Database File Check:')
    if (dbExists) {
      const stats = fs.statSync(dbPath)
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`   ✅ Database file exists: ${dbPath}`)
      console.log(`   📊 File size: ${fileSizeMB} MB`)
      console.log(`   📅 Last modified: ${stats.mtime.toLocaleString()}`)
    } else {
      console.log(`   ❌ Database file not found: ${dbPath}`)
      console.log(`   💡 Run: npx prisma db push`)
      return
    }
    
    console.log('\n🔌 Connection Test:')
    
    // Test basic connection
    await prisma.$connect()
    console.log('   ✅ Successfully connected to database')
    
    // Test query - get table counts
    console.log('\n📊 Database Statistics:')
    
    const userCount = await prisma.user.count()
    console.log(`   👥 Users: ${userCount}`)
    
    const studentCount = await prisma.student.count()
    console.log(`   🎓 Students: ${studentCount}`)
    
    const teacherCount = await prisma.teacher.count()
    console.log(`   👨‍🏫 Teachers: ${teacherCount}`)
    
    const adminCount = await prisma.admin.count()
    console.log(`   🔐 Admins: ${adminCount}`)
    
    const courseCount = await prisma.course.count()
    console.log(`   📚 Courses: ${courseCount}`)
    
    const attendanceCount = await prisma.attendance.count()
    console.log(`   ✅ Attendances: ${attendanceCount}`)
    
    const paymentCount = await prisma.payment.count()
    console.log(`   💰 Payments: ${paymentCount}`)
    
    // Test a simple query
    console.log('\n🔍 Query Test:')
    const firstUser = await prisma.user.findFirst()
    if (firstUser) {
      console.log(`   ✅ Successfully queried user: ${firstUser.email} (${firstUser.role})`)
    } else {
      console.log('   ℹ️  No users found in database')
    }
    
    console.log('\n✅ Database connection test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:')
    console.error(`   Error: ${error.message}`)
    
    if (error.code === 'P1001') {
      console.error('   💡 Cannot reach database server. Check your connection string.')
    } else if (error.code === 'P1017') {
      console.error('   💡 Database connection closed. Check if database file is corrupted.')
    } else if (error.code === 'P2002') {
      console.error('   💡 Unique constraint violation.')
    } else {
      console.error(`   💡 Error code: ${error.code || 'UNKNOWN'}`)
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

testDatabaseConnection()


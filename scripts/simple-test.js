const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function simpleTest() {
  try {
    console.log('Testing database...')
    
    const teachers = await prisma.teacher.findMany()
    console.log('Teachers:', teachers.length)
    
    const students = await prisma.student.findMany()
    console.log('Students:', students.length)
    
    const courses = await prisma.course.findMany()
    console.log('Courses:', courses.length)
    
    const users = await prisma.user.findMany()
    console.log('Users:', users.length)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleTest()

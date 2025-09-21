const fetch = require('node-fetch')

async function testLoginAPI() {
  try {
    console.log('🌐 Testing login API endpoint...\n')
    
    const testCredentials = [
      { email: 'admin@test.com', password: 'password123', role: 'ADMIN' },
      { email: 'teacher@test.com', password: 'password123', role: 'TEACHER' },
      { email: 'student1@test.com', password: 'password123', role: 'STUDENT' }
    ]
    
    for (const cred of testCredentials) {
      console.log(`Testing ${cred.email} (${cred.role}):`)
      
      try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cred.email,
            password: cred.password
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          console.log(`  ✅ Login successful`)
          console.log(`  Token: ${data.token.substring(0, 20)}...`)
        } else {
          console.log(`  ❌ Login failed: ${data.error}`)
        }
        
      } catch (error) {
        console.log(`  ❌ API Error: ${error.message}`)
      }
      
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Error testing login API:', error)
  }
}

testLoginAPI()


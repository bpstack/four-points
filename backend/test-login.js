// Es un test que sirve para probar si la contraseña ingresada coincide con el hash en la base de datos
// Si no coinciden, genera un nuevo hash

// test-login.js
import bcrypt from 'bcrypt'

const passwordIngresada = 'password123'
const hashEnBD = '$2b$10$DUbH/7axkFVp9QN4QPGdUu9bncORX4RX5GO8tI/nL6fdisQeZJsWm'

bcrypt.compare(passwordIngresada, hashEnBD, (err, result) => {
  console.log('Password ingresada:', passwordIngresada)
  console.log('Hash en BD:', hashEnBD)
  console.log('¿Coinciden?:', result ? '✅ SÍ' : '❌ NO')

  if (!result) {
    console.log('\n⚠️ El hash NO corresponde a esa contraseña')
    console.log('Genera un hash nuevo con:')
    bcrypt.hash(passwordIngresada, 10, (e, h) => {
      console.log('Nuevo hash:', h)
    })
  }
})

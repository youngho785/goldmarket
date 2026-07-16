// scripts/grant-admin.mjs
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

initializeApp({ credential: applicationDefault() })

const email = process.argv[2]
const role  = (process.argv[3] || '').toLowerCase() // 'admin' | 'super'

if (!email || !['admin','super'].includes(role)) {
  console.error('Usage: node scripts/grant-admin.mjs <email> <admin|super>')
  process.exit(1)
}

const auth = getAuth()
try {
  const user = await auth.getUserByEmail(email)
  const claims = role === 'super'
    ? { admin: true, superAdmin: true }
    : { admin: true }

  await auth.setCustomUserClaims(user.uid, claims)
  await auth.revokeRefreshTokens(user.uid) // 즉시 반영
  console.log(`✅ ${email} ->`, claims)
  process.exit(0)
} catch (err) {
  console.error('❌ Failed:', err.message)
  process.exit(1)
}

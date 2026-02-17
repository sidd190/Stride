import express from 'express'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import jwt from 'jsonwebtoken'

const router = express.Router()

router.post('/verify', async (req, res) => {
  const { publicKey, signature, message } = req.body

  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = bs58.decode(publicKey)

    const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)

    if (!verified) {
      console.log('Signature verification failed')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const token = jwt.sign({ wallet: publicKey }, process.env.JWT_SECRET || 'your-secret-key')

    res.json({ token })
  } catch (error) {
    console.error('Verification error:', error)
    res.status(500).json({ error: 'Verification failed', details: error.message })
  }
})

export default router

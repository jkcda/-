import express from 'express'

const router = express.Router()

// GET /api/user
router.get('/', (req, res) => {
  res.json({ message: 'User route' })
})

// GET /api/user/:id
router.get('/:id', (req, res) => {
  const { id } = req.params
  res.json({ id, message: 'User detail' })
})

export default router
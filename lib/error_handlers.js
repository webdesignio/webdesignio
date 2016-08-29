'use strict'

module.exports = { handleJSONError }

function handleJSONError (err, req, res, next) {
  if (err.statusCode) {
    res.status(err.statusCode).send({ message: err.message })
    return
  }
  if (err.name === 'ValidationError') {
    res.status(400).send({ message: 'Invalid request body' })
    return
  }
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({ message: err.message })
    return
  }
  next(err)
}

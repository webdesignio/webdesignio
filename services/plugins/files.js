'use strict'

const mongoose = require('mongoose')
const Grid = require('gridfs-stream')

module.exports = {
  getFile (query) {
    const gfs = Grid(mongoose.connection.db, mongoose.mongo)
    return new Promise((resolve, reject) => {
      gfs.files.findOne(query, (err, file) => {
        if (err) return reject(err)
        resolve(file)
      })
    })
  },

  getFiles (query) {
    const gfs = Grid(mongoose.connection.db, mongoose.mongo)
    return new Promise((resolve, reject) => {
      gfs.files.find(query).toArray((err, files) => {
        if (err) return reject(err)
        resolve(files)
      })
    })
  }
}

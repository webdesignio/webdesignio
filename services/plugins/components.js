'use strict'

const mongoose = require('mongoose')
const Grid = require('gridfs-stream')

module.exports = {
  getComponents (query) {
    return new Promise((resolve, reject) => {
      const gfs = Grid(mongoose.connection.db, mongoose.mongo)
      gfs.files.find(query).toArray((err, files) => {
        if (err) return reject(err)
        resolve(
          Promise.all(
            files.map(file => readComponent(gfs, file))
          )
        )
      })
    })
    .then(componentList =>
      componentList.reduce(
        (components, [name, buffer]) =>
          Object.assign({}, components, { [name]: buffer }),
        {}
      )
    )
  }
}

function readComponent (gfs, file) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    gfs.createReadStream({ _id: file._id })
      .on('error', reject)
      .on('data', d => { buffer += d })
      .on('end', () =>
        resolve([file.filename.replace(/^components\//, ''), buffer])
      )
  })
}

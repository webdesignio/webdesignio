'use strict'

'use strict'

const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const Bluebird = require('bluebird')

module.exports = {
  patch (changes) {
    const gfs = Grid(mongoose.connection.db, mongoose.mongo)
    const remove = Bluebird.promisify(gfs.remove, { context: gfs })

    return Promise.all(
      changes.map(change => {
        switch (change.type) {
          case 'REMOVE': {
            const { _id } = change
            return remove({ _id })
          }
        }
      })
    )
  }
}

'use strict'

const mongoose = require('mongoose')
const Busboy = require('busboy')
const { Observable } = require('rx')
const Grid = require('gridfs-stream')
const bunyan = require('bunyan')

module.exports = deploy

const fleet = {}

Object.assign(fleet,
  { log: bunyan.createLogger({ name: 'deploy' }) },
  require('./plugins/diff'),
  require('./plugins/patch')
)

function deploy (req, res, next) {
  parseFiles(req)
    .then(incomingFiles =>
      fleet.diff({ incomingFiles, website: req.query.website })
    )
    .then(diff =>
      fleet
        .patch(diff.filter(c => c.type === 'REMOVE'))
        .then(() => diff)
    )
    .then(diff =>
      diff
        .reduce(
          (stats, change) => {
            const key = change.type.toLowerCase()
            return Object.assign({}, stats, {
              [key]: stats[key] + 1
            })
          },
          { create: 0, update: 0, remove: 0 }
        )
    )
    .then(result => res.send(result))
    .catch(next)
}

function parseFiles (req) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  const busboy = new Busboy({ headers: req.headers })
  const validTypes = ['pages', 'objects', 'components']
  const metadata = {}
  return Observable.create(observer => {
    busboy.on('field', (fieldname, value) => {
      const type = fieldname.split('/')[0]
      if (validTypes.indexOf(type) === -1) return
      if (fieldname.endsWith('.meta.json')) {
        // Ignore parsing errors of invalid JSON
        try {
          metadata[fieldname.replace(/\.meta\.json$/, '')] =
            JSON.parse(value)
        } catch (e) { }
      }
    })
    busboy.on('file', (fieldname, file, filename) => {
      if (fieldname === 'assets') {
        fleet.log.info('uploading assets', {
          filename: fieldname,
          metadata: { website: req.query.website, type: 'assets' }
        })
        observer.onNext(
          replaceFile({
            gfs,
            query: {
              'metadata.website': req.query.website,
              filename: 'assets'
            },
            data: {
              filename: fieldname,
              metadata: { website: req.query.website, type: 'assets' }
            },
            file
          })
          .then(() => ({ type: 'assets' }))
        )
        return
      }
      const type = fieldname.split('/')[0]
      if (validTypes.indexOf(type) === -1) {
        // Skip unknown file types
        file.resume()
        return
      }
      const query = {
        filename: fieldname,
        'metadata.website': req.query.website
      }
      observer.onNext(
        replaceFile({
          gfs,
          query,
          data: {
            filename: fieldname,
            metadata: Object.assign(
              {},
              metadata[fieldname],
              { website: req.query.website, type }
            )
          },
          file
        })
        .then(({ previousFile, file }) =>
          ({ type: 'file', old: previousFile, new: file })
        )
      )
    })
    busboy.on('error', err => observer.onError(err))
    busboy.on('finish', () => observer.onCompleted())
    req.pipe(busboy)
  })
  .reduce((promises, promise) => promises.concat([promise]), [])
  .flatMap(promises => Observable.fromPromise(Promise.all(promises)))
  .toPromise()
  .then(uploads => uploads.filter(({ type }) => type === 'file'))
}

function replaceFile ({ gfs, query, data, file }) {
  return new Promise((resolve, reject) => {
    gfs.files.findOne(query, (err, fileObject) => {
      if (err) return reject(err)
      if (fileObject) {
        return gfs.remove(query, writeFile)
      }
      writeFile()

      function writeFile (err) {
        if (err) return reject(err)
        const stream = gfs.createWriteStream(data)
        file
          .pipe(stream)
          .on('error', reject)
          .on('close', f => resolve({ previousFile: fileObject, file: f }))
      }
    })
  })
}

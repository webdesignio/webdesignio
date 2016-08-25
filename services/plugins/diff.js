'use strict'

const mongoose = require('mongoose')
const { Observable } = require('rx')
const Grid = require('gridfs-stream')
const differenceBy = require('lodash/fp/differenceBy')

module.exports = {
  diff ({ incomingFiles, website }) {
    const gfs = Grid(mongoose.connection.db, mongoose.mongo)
    const positiveChanges = incomingFiles
      .map(({ old, new: newFile }) =>
        old
          ? (old.md5 === newFile.md5
              ? null
              : { type: 'UPDATE', filename: newFile.filename })
          : { type: 'CREATE', filename: newFile.filename }
      )
      .filter(c => !!c)
    const negativeChange$ =
      Observable
        .combineLatest(
          Observable.just(incomingFiles.map(f => f.new)),
          Observable.create(observer => {
            gfs.files.find({
              'metadata.website': website,
              'metadata.type': { $ne: 'assets' }
            })
            .toArray(function (err, files) {
              if (err) return observer.onError(err)
              observer.onNext(files)
              observer.onCompleted()
            })
          }),
          (incomingFiles, existingFiles) =>
            differenceBy(
              f => f.filename,
              existingFiles,
              incomingFiles
            )
        )
        .flatMap(fs => Observable.from(fs))
        .map(({ _id, filename }) => ({ type: 'REMOVE', _id, filename }))

    return Observable.merge(
      Observable.from(positiveChanges),
      negativeChange$
    )
    .reduce((changes, change) => changes.concat([change]), [])
    .toPromise()
  }
}

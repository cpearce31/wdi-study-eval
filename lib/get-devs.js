'use strict'

const developersPromise = new Promise((resolve, reject) => {
  const developers = []
  const fs = require('fs')
  const parse = require('csv').parse
  const parser = parse({
    columns: h => h.map(c => c.toLowerCase())
  })

  const input = fs.createReadStream(process.env.DEVELOPERS)
  input.on('error', e => reject(e))

  parser.on('readable', () => {
    let record
    while ((record = parser.read())) {
      record.github = record.github.toLowerCase()
      developers.push(record)
    }
  })

  parser.on('error', e => reject(e))
  parser.on('finish', () => resolve(developers))
  input.pipe(parser)
})

module.exports = developersPromise

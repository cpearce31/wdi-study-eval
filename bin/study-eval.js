#!/usr/bin/env node
'use strict'

require('dotenv').load()

const pullsPromise = function (devs) {
  return new Promise((resolve, reject) => {
    const https = require('https')

    const user = process.env.GHUSER
    const token = process.env.GHTOKEN
    const repo = process.argv[2]

    const options = {
      hostname: 'git.generalassemb.ly',
      port: 443,
      path: `/api/v3/repos/ga-wdi-boston/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
      method: 'GET',
      auth: `${user}:${token}`,
      headers: {
        'User-Agent': 'curl/7.38.0'
      }
    }

    https.get(options, (res) => {
      let result = ''

      res.on('data', data => {
        result += data
      })

      if (res.statusCode !== 200) {
        res.on('end', () => reject(result))
      } else {
        res.on('end', () => {
          const pulls = JSON.parse(result)
            .filter(pull => pull.state === 'open' &&
                    devs.some(dev => dev.github === pull.user.login.toLowerCase()))
            .map(pull => {
              return {
                github: pull.user.login.toLowerCase(),
                url: pull.url,
                diff_url: pull.diff_url,
                comment_url: pull.review_comments_url,
                legit: true
              }
            })

          resolve(pulls)
        })
      }
    }).on('error', e => reject(e))
  })
}

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

developersPromise.then(pullsPromise).then(console.log)

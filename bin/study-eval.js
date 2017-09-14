#!/usr/bin/env node
'use strict'

require('colors')
require('dotenv').load()
const https = require('follow-redirects').https
const prompt = require('prompt-sync')({ sigint: true })

const user = process.env.GHUSER
const token = process.env.GHTOKEN
const defaultComment = process.env.COMMENT
const repo = process.argv[2]

console.reset = function () {
  return process.stdout.write('\x1Bc')
}

const extractPath = url => '/' + url.split('/').slice(3).join('/')

const options = {
  hostname: 'git.generalassemb.ly',
  port: 443,
  path: `/api/v3/repos/ga-wdi-boston/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
  auth: `${user}:${token}`,
  headers: {
    'User-Agent': 'node-script'
  }
}

const getPulls = function (devs) {
  return new Promise((resolve, reject) => {
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
                comment_url: pull.comments_url,
                body: pull.body,
                commented: false
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

const getDiffs = function (pulls) {
  return Promise.all(pulls.map(pull => {
    return new Promise((resolve, reject) => {
      options.path = extractPath(pull.diff_url)
      https.get(options, (res) => {
        let result = ''

        res.on('data', data => {
          result += data
        })

        if (res.statusCode !== 200) {
          res.on('end', () => reject(result))
        } else {
          res.on('end', () => {
            pull.diff = result.split(/\r?\n/)
                              .filter(line => line[0] === '+' ||
                                              line[0] === '-')
                              .map(line => line[0] === '-' ? '=== response ===' : line)
                              .join('\n')
            resolve(pull)
          })
        }
      }).on('error', e => reject(e))
    })
  }))
}

const badPulls = []

const inspectDiffs = function (pulls) {
  pulls.forEach(pull => {
    console.reset()
    console.log('=== PR MESSAGES ===\n'.red)
    console.log('GHE Username:'.blue, pull.github)
    console.log('PR Body:'.blue, pull.body)
    const useDefault = prompt('Use default comment? (y/n/x) '.green, 'y')
    if (useDefault === 'x') { process.exit() }
    pull.useDefault = useDefault === 'y'
  })
  pulls.forEach(pull => {
    console.reset()
    console.log('=== PR DIFFS ===\n'.red)
    console.log('PR diff:\n'.blue, pull.diff)
    const isLegit = prompt('Is this a reasonable response? (y/n/x) '.green, 'y')
    if (isLegit === 'x') { process.exit() }
    pull.isLegit = isLegit === 'y'
    if (!pull.isLegit) { badPulls.push(pull) }
  })
  return pulls
}

const addComments = function (pulls) {
  pulls.forEach(pull => {
    if (!pull.useDefault) {
      console.reset()
      console.log('=== CUSTOM COMMENTS ===\n'.red)
      console.log('GHE Username:'.blue, pull.github)
      console.log('PR Body:'.blue, pull.body)
      console.log('PR diff:\n'.blue, pull.diff)
      pull.comment = prompt('Enter a custom comment for the above PR: ')
    }
  })
  pulls.map(pull => {
    return new Promise((resolve, reject) => {
      if (!pull.isLegit) {
        resolve(pull)
      }
      options.path = extractPath(pull.comment_url)
      options.method = 'POST'

      console.log(options)
      const req = https.request(options, (res) => {
        let result = ''

        res.on('data', data => {
          result += data
        })

        if (res.statusCode !== 200) {
          res.on('end', () => reject(result))
        } else {
          res.on('end', () => {
            pull.commented = true
            resolve(pull)
          })
        }
      }).on('error', e => reject(e))
      req.write(JSON.stringify({'body': pull.useDefault ? defaultComment : pull.comment}))
      req.end()
    })
  })
  return Promise.all(pulls)
}

const closePulls = pulls => {
  pulls.map(pull => {
    return new Promise((resolve, reject) => {
      if (!pull.isLegit) {
        resolve(pull)
      }
      options.path = extractPath(pull.url)
      options.method = 'PATCH'

      console.log(options)
      const req = https.request(options, (res) => {
        let result = ''

        res.on('data', data => {
          result += data
        })

        if (res.statusCode !== 200) {
          res.on('end', () => reject(result))
        } else {
          res.on('end', () => {
            pull.closed = true
            resolve(pull)
          })
        }
      }).on('error', e => reject(e))
      req.write(JSON.stringify({'state': 'closed'}))
      req.end()
    })
  })
  return Promise.all(pulls)
}

const displayFinalOutput = pulls => {
  console.reset()
  console.log('=== STUFF TO DO BY HAND ===\n'.red)
  console.log('The following pulls will need to be addressed manually: \n')
  if (badPulls.length > 0) {
    badPulls.forEach(pull => {
      console.log(pull)
    })
  } else {
    console.log('None!\n')
  }
  // const problemPulls = []
  // pulls.forEach(pull => {
  //   if (pull.isLegit && (!pull.closed || !pull.commented)) {
  //     problemPulls.push(pull)
  //   }
  // })
  // console.reset()
  // console.log('=== STATUS ===\n'.red)
  // console.log(problemPulls.length > 0 ? problemPulls : 'All pulls commented and closed.')
}

developersPromise
  .then(getPulls)
  .then(getDiffs)
  .then(pulls => {
    return addComments(inspectDiffs(pulls))
  })
  .then(closePulls)
  .then(displayFinalOutput)
  .catch(console.error)

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
                commented: false,
                closed: false
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
  if (pulls.length === 0) {
    console.log('No pull requests found for the developers in that CSV.')
    process.exit()
  }
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
                              .map(line => line[0] === '-' ? line.red : line.green)
                              .join('\n')
            resolve(pull)
          })
        }
      }).on('error', e => reject(e))
    })
  })).catch(console.error)
}

const badPulls = []

const inspectDiffs = function (pulls) {
  pulls.forEach(pull => {
    console.reset()
    console.log('=== PR MESSAGES ===\n'.red)
    console.log('GHE Username:'.blue, pull.github)
    console.log('PR Body:'.blue, pull.body)
    const useDefault = prompt('Use default comment? (y/n/x) '.yellow, 'y')
    if (useDefault === 'x') { process.exit() }
    pull.useDefault = useDefault === 'y'
  })
  pulls.forEach(pull => {
    console.reset()
    console.log('=== PR DIFFS ===\n'.red)
    console.log('PR diff:\n'.blue, pull.diff)
    const isLegit = prompt('Is this a reasonable response? (y/n/x) '.yellow, 'y')
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
      pull.comment = prompt('Enter a custom comment for the above PR: '.yellow)
    }
  })
  const commentedPulls = pulls.map(pull => {
    return new Promise((resolve, reject) => {
      if (!pull.isLegit) {
        resolve(pull)
      } else {
        options.path = extractPath(pull.comment_url)
        options.method = 'POST'

        const req = https.request(options, (res) => {
          let result = ''

          res.on('data', data => {
            result += data
          })

          if (res.statusCode !== 201) {
            res.on('end', () => reject(result))
          } else {
            res.on('end', () => {
              resolve(Object.assign(pull, {commented: true}))
            })
          }
        }).on('error', e => reject(e))
        req.write(JSON.stringify({'body': pull.useDefault ? defaultComment : pull.comment}))
        req.end()
      }
    })
  })
  return Promise.all(commentedPulls).catch(console.error)
}

const closePulls = pulls => {
  const closedPulls = pulls.map(pull => {
    return new Promise((resolve, reject) => {
      if (!pull.isLegit) {
        resolve(pull)
      } else {
        options.path = extractPath(pull.url)
        options.method = 'PATCH'

        const req = https.request(options, (res) => {
          let result = ''

          res.on('data', data => {
            result += data
          })

          if (res.statusCode !== 200) {
            res.on('end', () => reject(result))
          } else {
            res.on('end', () => {
              resolve(Object.assign(pull, {closed: true}))
            })
          }
        }).on('error', e => reject(e))
        req.write(JSON.stringify({'state': 'closed'}))
        req.end()
      }
    })
  })
  return Promise.all(closedPulls).catch(console.error)
}

const displayFinalOutput = pulls => {
  console.reset()
  console.log('=== STUFF TO DO BY HAND ===\n'.red)
  console.log('The following pulls will need to be addressed manually: \n')
  if (badPulls.length > 0) {
    badPulls.forEach(pull => {
      console.log('Marked as an insufficent response:', pull)
    })
  } else {
    console.log('None!\n')
  }
  const problemPulls = []
  pulls.forEach(pull => {
    if (pull.isLegit && (!pull.closed || !pull.commented)) {
      problemPulls.push(pull)
    }
  })
  console.log('\n=== STATUS ===\n'.red)
  console.log(problemPulls.length > 0 ? problemPulls : 'All pulls commented and closed.\n')
}

developersPromise
  .then(getPulls)
  .then(getDiffs)
  .then(pulls => {
    return addComments(inspectDiffs(pulls)).catch(problem => {
      console.log('Promise rejected after addComments', problem)
    })
  })
  .then(closePulls)
  .then(displayFinalOutput)
  .catch(problem => console.log('Promise rejected at end of chain', console.log(problem)))

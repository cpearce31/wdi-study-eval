#!/usr/bin/env node
'use strict'

// apparently, node has only four service workers for resolving
// DNS info by default. If those DNS queries are taking a long
// time, DNS resolution will block and node will barf.
// This can happen on slow computers in the main loop of this
// script. The following increases that limit from 4 to 128.
process.env.UV_THREADPOOL_SIZE = 128

require('colors')
require('dotenv').load()
const fs = require('fs')
const https = require('follow-redirects').https
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const developersPromise = require('../lib/get-devs')

const user = process.env.GHUSER
const token = process.env.GHTOKEN
const defaultComment = process.env.COMMENT
const resultsDir = process.env.RESULTSDIR
const cohort = process.env.DEVELOPERS.replace(/csv|[^a-z0-9]/g, '')
const repo = process.argv[2]

console.reset = () => process.stdout.write('\x1Bc')

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

const processDiff = diff => {
  let lines = diff.split(/\r?\n/)
  let packageLockStart = null
  let packageLockLength = null
  for (let i = 0; i < lines.length; i++) {
    if (!packageLockStart && /package-lock/.test(lines[i])) {
      packageLockStart = i
    } else if (packageLockStart !== null &&
               /diff --git/.test(lines[i]) &&
               !packageLockLength) {
      packageLockLength = i - packageLockStart
    }
  }
  if (packageLockStart !== null && packageLockLength) {
    lines.splice(packageLockStart, packageLockLength)
  }
  lines = lines.map(line => {
    if (line[0] === '+' && /\?/.test(line)) {
      return line.bgCyan.black
    } else if (line[0] === '-') {
      return line.red
    } else if (line[0] === '+') {
      return line.green
    } else {
      return line
    }
  })
  return lines.join('\n')
}

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
            pull.diff = processDiff(result)
            resolve(pull)
          })
        }
      }).on('error', e => reject(e))
    })
  })).catch(console.error)
}

const badPulls = []

const printPRInfo = (pull, pulls, i) => {
  console.reset()
  console.log(`=== PR ${i + 1}/${pulls.length} ===\n`.red)
  console.log('GHE Username:'.blue, pull.github)
  console.log('PR Body:'.blue, pull.body)
  if (pull.testResults && !pull.testsAreBorked) {
    console.log('Tests:'.blue, `${pull.passing} passing`, `${pull.failing} failing`)
  } else if (pull.testsAreBorked) {
    console.log('Tests:'.blue, 'failed')
  }
  console.log('PR diff:\n'.blue, pull.diff)
}

const ask = question => new Promise((resolve, reject) => {
  rl.question(question, answer => resolve(answer))
})

const checkTests = async function (pulls) {
  pulls.forEach(pull => {
    const testPath = `${resultsDir}/${cohort}/${repo}/${pull.github}.txt`

    if (fs.existsSync(testPath)) {
      pull.testResults = fs.readFileSync(testPath, 'utf8')

      if (/mochacli/.test(pull.testResults) &&
          /passing|failing/.test(pull.testResults)) {
        const pRegexArray = /(\d+) passing/.exec(pull.testResults)
        const fRegexArray = /(\d+) failing/.exec(pull.testResults)
        pull.passing = pRegexArray ? pRegexArray[1] : 'fail'
        pull.failing = fRegexArray ? fRegexArray[1] : '0'
      } else if (/rspec/.test(pull.testResults) &&
                 /examples/.test(pull.testResults)) {
        const totalTests = /(\d+) examples/.exec(pull.testResults)[1]
        const fRegexArray = /(\d+) failures/.exec(pull.testResults)
        pull.failing = fRegexArray ? fRegexArray[1] : 0
        pull.passing = +totalTests - +pull.failing
      } else {
        pull.testsAreBorked = true
      }
    }
  })
  return Promise.resolve(pulls)
}

const inspectDiffs = async function (pulls) {
  let i

  const handleInputs = input => {
    if (input === 'x') {
      process.exit()
    } else if (input === 'back' && i > 0) {
      i -= 2
    } else if (input !== 'n' && input !== 'y') {
      i -= 1
    }
  }

  for (i = 0; i < pulls.length; i++) {
    const pull = pulls[i]
    printPRInfo(pull, pulls, i)

    const isLegit = await ask('Close and comment this PR? (y/n/x/back): '.yellow)
    handleInputs(isLegit)

    if (isLegit === 'y') {
      pull.isLegit = true
    } else if (isLegit === 'n') {
      pull.isLegit = false
      badPulls.push(pull)
      continue
    } else {
      continue
    }

    const useDefault = await ask('Use default comment? (y/n/x/back): '.yellow)
    handleInputs(useDefault)

    if (useDefault === 'y') {
      pull.useDefault = true
      continue
    } else if (useDefault === 'n') {
      pull.useDefault = false
    } else {
      continue
    }

    pull.comment = await ask('Enter a custom comment for this PR: '.yellow)
  }
  return pulls
}

const addComments = function (pulls) {
  return Promise.all(pulls.map(pull => {
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
  })).catch(console.log)
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
      console.log('Marked as an insufficent response:', {
        github: pull.github,
        url: pull.url
      })
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
  console.log(problemPulls.length > 0 ? problemPulls : 'All approved pulls commented and closed.\n')
  process.exit()
}

developersPromise
  .then(getPulls)
  .then(getDiffs)
  .then(checkTests)
  .then(inspectDiffs)
  .then(addComments)
  .then(closePulls)
  .then(displayFinalOutput)
  .catch(problem => console.log('Promise rejected at end of chain', console.log(problem)))

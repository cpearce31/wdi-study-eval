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
const child = require('child_process')
const exec = child.exec
const execFile = child.execFile
const developersPromise = require('../lib/get-devs')

let extension
let fileName

const user = process.env.GHUSER
const token = process.env.GHTOKEN
const repo = process.argv[2]
const cohort = process.env.DEVELOPERS.replace(/csv|[^a-z0-9]/g, '')
const resultsDir = process.env.RESULTSDIR
const repoUrl = `https://git.generalassemb.ly/ga-wdi-boston/${repo}`

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
          resolve(pulls)
        })
      }
    }).on('error', e => reject(e))
  })
}

const setupDir = pulls => {
  return new Promise((resolve, reject) => {
    exec('sh lib/sephamore-setup.sh' + ' ' +
      repo + ' ' +
      cohort + ' ' +
      resultsDir + ' ' +
      repoUrl,
      (error, stdout, stderr) => {
        if (error) {
          reject(error)
        }
        console.log(`cloned repository ${repo}`.yellow)
        console.log('installing dependencies...\n'.yellow)
        if (stdout === 'fail') {
          console.log('Build failed. This could be caused by a bad dependency manifest, or because you do not have npm or bundler installed. Or it could be a bug in this script.'.red)
          process.exit()
        } else {
          extension = stdout.trim()
          repo === 'js-reference-types-practice'
          ? fileName = 'mbta.js'
          : fileName = repo.split('-').pop() + '.' + extension
        }
        resolve(pulls)
      })
  })
}

const runTests = async function (pulls) {
  for (let i = 0; i < pulls.length; i++) {
    const pull = pulls[i]
    const testPromise = new Promise((resolve, reject) => {
      options.path = `/${pull.user.login}/${repo}/raw/${pull.head.sha}/lib/${fileName}`
      https.get(options, (res) => {
        let result = ''

        res.on('data', data => {
          result += data
        })

        if (res.statusCode !== 200) {
          res.on('end', () => reject('error getting the raw file'))
        } else {
          res.on('end', () => {
            const diagnosticPath = `${resultsDir}/${cohort}/${repo}/${repo}/lib/${fileName}`
            fs.writeFile(diagnosticPath, result, () => {
              execFile('lib/sephamore.sh', [repo, cohort, pull.user.login.toLowerCase(), extension, resultsDir], (error, stdout, stderr) => {
                if (error) {
                  reject('exec error')
                }
                console.log(`Tests run, results saved for ${pull.user.login}`)
                resolve(pull)
              })
            })
          })
        }
      }).on('error', e => reject(e))
    })
    await testPromise
  }
  Promise.resolve()
}

const cleanUp = pulls => {
  exec(`rm -rf ${resultsDir}/${cohort}/${repo}/${repo}`, () => {
    console.log('\nAll tests complete, testing directory removed.'.yellow)
  })
}

developersPromise
  .then(getPulls)
  .then(setupDir)
  .then(runTests)
  .then(cleanUp)
  .catch(problem => {
    console.log(`Promise rejected because: ${problem}`)
  })

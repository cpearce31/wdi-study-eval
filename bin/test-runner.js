#!/usr/bin/env node
'use strict'

require('colors')
require('dotenv').load()
const https = require('follow-redirects').https
const exec = require('child_process').exec
const developersPromise = require('../lib/get-devs')

const user = process.env.GHUSER
const token = process.env.GHTOKEN
const repo = process.argv[2]
const template = process.argv[3]
const cohort = process.env.DEVELOPERS.replace(/csv|[^a-z0-9]/g, '')
const resultsDir = process.env.RESULTSDIR

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

const runTests = function (pulls) {
  console.log('Setting up test directories...'.yellow)
  exec(`sh lib/sephamore-setup.sh ${repo} ${cohort} ${resultsDir}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`)
    }
    console.log(stdout)
    pulls.forEach(pull => {
      exec(`sh lib/sephamore.sh https://git.generalassemb.ly/${pull.user.login}/${repo}.git ${repo} ${cohort} ${pull.user.login} ${template} ${resultsDir}`, (error, stdout, stderr) => {
        console.log(`Finshed build and tests for ${pull.user.login}:`.yellow)
        console.log(stdout)
        if (error) {
          console.error(`exec error: ${error}`)
        }
      })
    })
  })
}

// runTests([{login: 'foobar'}])

developersPromise.then(getPulls).then(runTests).catch(console.log)

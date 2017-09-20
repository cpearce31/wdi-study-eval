'use strict'

const https = require('follow-redirects').https
const exec = require('child_process').exec
require('dotenv').load()

const developersPromise = require('../lib/get-devs')

const user = process.env.GHUSER
const token = process.env.GHTOKEN
const cohort = process.env.DEVELOPERS.replace(/csv|[^A-Za-z0-9]/g)
const repo = process.argv[2]
const template = process.argv[3]

const baseDir = __dirname.split('/').slice(0, -1).join('/')

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
              github: pull.login
            }
          })
          resolve(pulls)
        })
      }
    }).on('error', e => reject(e))
  })
}

const runTests = function (pulls) {
  pulls.forEach(pull => {
    const ssh = `https://git.generalassemb.ly/${pull.github}/${repo}.git`
    exec(`sh ${baseDir}/lib/sephamore.sh ${ssh} ${repo} ${cohort} ${pull.github} ${template}`,
    (console.log(`=== finished ${pull.github}`))
    )
  })
}

// https://git.generalassemb.ly/bradleyden/ember-study.git

developersPromise
.then(getPulls)
.then(console.log)
.then(runTests)

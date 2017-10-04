'use strict'

// apparently, node has only four service workers for resolving
// DNS info by default. If those DNS queries are taking a long
// time, DNS resolution will block and node will barf.
// This can happen on slow computers in the main loop of this
// script. The following increases that limit from 4 to 128.
process.env.UV_THREADPOOL_SIZE = 128

const missingFromOtherList = require('../lib/missing-from-other-list')

require('dotenv').load()

const developersPromise = require('../lib/get-devs')

const compare = (a, b) => a.github > b.github ? 1 : a.github < b.github ? -1 : 0

const pullsPromise = new Promise((resolve, reject) => {
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

    res.on('data', d => { result += d })

    if (res.statusCode !== 200) {
      // console.log('headers: ', res.headers)
      res.on('end', () => reject(result))
    } else {
      res.on('end', () => {
        const pulls = JSON.parse(result).map(p => ({
          state: p.state,
          github: p.user.login.toLowerCase()
        })).sort(compare)
        const uniquePulls = []
        for (let i = 1; i < pulls.length; i++) {
          if (compare(pulls[i - 1], pulls[i])) {
            uniquePulls.push(pulls[i - 1])
          }
        }

        if ((pulls.length > 1 &&
            compare(pulls[pulls.length - 1], pulls[pulls.length - 2])) ||
            pulls.length) {
          uniquePulls.push(pulls[pulls.length - 1])
        }

        resolve(uniquePulls)
      })
    }
  }).on('error', e => reject(e))
})

Promise.all([pullsPromise, developersPromise]).then((results) => {
  const missing = missingFromOtherList(results[0], results[1], compare)

  console.log('closed pulls: ',
    results[0].filter(p => p.state === 'closed').length)
  console.log('pulls missing developers: ', missing[0].filter(p => p.state !== 'closed'))
  console.log(`developers missing pulls (${missing[1].length}): `)
  missing[1].forEach(d => console.log(d.given, d.family, `(${d.github})`))
}).catch(e => {
  console.error('Something went wrong!')
  console.error(e)
  if (e.stack) console.error(e.stack)
})

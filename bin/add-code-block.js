#!/usr/bin/env node
'use strict'

const readline = require('readline')
const fs = require('fs')
const path = require('path')

const addCodeBlocks = function (inPath, outPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inPath)
  })

  const outStream = fs.createWriteStream(outPath)

  let inCodeBlock = false

  rl.on('line', (line) => {
    if (inCodeBlock) {
      inCodeBlock = !/<!-- end code block -->/.test(line)
      if (!inCodeBlock) outStream.write('```\n' + `${line}\n`)
    } else {
      outStream.write(`${line}\n`)
      inCodeBlock = /<!-- start code block .+ -->/.test(line)
      if (inCodeBlock) {
        const filename = line.match(/ +file="(.+)" +/)[1]
        const extension = path.extname(filename).slice(1)
        outStream.write('```' + `${extension}\n`)
        outStream.write(fs.readFileSync(filename))
      }
    }
  })
}

addCodeBlocks(process.argv[2], '/dev/stdout')

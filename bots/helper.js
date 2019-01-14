// This file should not contain anything related to the mineflayer bot object
const colors = require('./colors.js')
const fs = require('fs')

/* global */
global.sleep = sleep
global.colors = colors
global.createToken = createToken
global.createChildToken = createChildToken

module.exports.color = color
module.exports.randColor = randColor

module.exports.writeAccountTimes = writeAccountTimes
module.exports.readAccountTimes = readAccountTimes

module.exports.writeAccountUsernames = writeAccountUsernames
module.exports.readAccountUsernames = readAccountUsernames

module.exports.writeAccountCoins = writeAccountCoins
module.exports.readAccountCoins = readAccountCoins

module.exports.writeAccountSignPos = writeAccountSignPos
module.exports.readAccountSignPos = readAccountSignPos

module.exports.getSignPosition = getSignPosition
module.exports.updateSignPosition = updateSignPosition

module.exports.readUsernames = readUsernames

module.exports.readAccounts = readAccounts
module.exports.readAfkAccounts = readAfkAccounts

module.exports.disableAccount = disableAccount

function createChildToken (parentToken, expires) {
  const token = createToken(expires)

  const parentTokenCancel = parentToken.cancel
  const parentTokenComplete = parentToken.complete

  parentToken.complete = () => {
    token.complete()
    parentTokenComplete()
  }

  parentToken.cancel = () => {
    token.cancel()
    parentTokenCancel()
  }

  return token
}

function createToken (expires = 10 * 1000) {
  expires = expires || 60 * 1000

  const token = {
    created: new Date(),
    canceled: false,
    cancel: () => {
      token.canceled = true
      token.complete()
    },
    complete: () => { token.completed = true },
    completed: false,
    expires
  }

  setTimeout(() => {
    token.cancel()
  }, expires)

  return token
}

function color (string, color) {
  if (!string) return ''
  return color + string + colors.Fg.White
}

function randColor (string) {
  const colorKeys = Object.keys(colors.Fg)
  const colorKey = colorKeys[Math.floor(colorKeys.length * Math.random())]
  return colors.Fg[colorKey] + string + colors.Fg.White
}

function readUsernames () {
  const contents = readAccountUsernames()

  let usernames = []

  Object.entries(contents).forEach(([email, val]) => {
    usernames.push(val.username)
  })

  return usernames
}

function readAfkAccounts () {
  return readAccounts(false, '../afk.txt')
}

function readAccounts (printDisabled = false, file = '../accounts.txt') {
  const contents = fs.readFileSync(file, 'utf8')
  const lines = contents.split('\n')

  let accounts = []

  for (let line of lines) {
    if (!line) continue

    if (line.split(':').length < 2) {
      console.log('Could not read the row (' + line.trim() +
        ') in accounts.txt, make sure it cotains username:password')

      continue
    }

    if (!line.split(':')[0]) {
      if (printDisabled) console.log('Account disabled ' + line.split(':')[1])
      continue
    }

    let parts = line.split(':')
    const username = parts[0].trim()
    const password = parts[1].trim()

    accounts.push({ username, password, isMaster: parts.length > 2 })
  }

  if (accounts.filter(acc => acc.isMaster).length > 1) { console.log('Warning found two masters, the first one will most likley be used') }
  if (accounts.filter(acc => acc.isMaster).length < 1) { console.log('Warning found no master, some things may not work as expected') }

  return accounts
}

function disableAccount (account, file = '../accounts.txt') {
  let contents = fs.readFileSync(file, 'utf8')

  let index = -1
  do {
    index = contents.indexOf(account, index + 2)
    if (index === -1) break

    let s1 = contents.substring(0, index)
    let s2 = contents.substring(index)

    contents = s1 + ':' + s2
  } while (index !== -1)

  fs.writeFileSync(file, contents, 'utf8')
}

function getSignPosition (username, fallbackPosition) {
  const signs = readAccountSignPos()
  let pos = signs[username]
  if (!pos) return fallbackPosition

  return { x: pos.x, y: pos.y, z: pos.z }
}

function updateSignPosition (sign, username) {
  const signs = readAccountSignPos()

  const pos = sign.position
  signs[username] = { x: pos.x, y: pos.y, z: pos.z }

  writeAccountSignPos(signs)
}

function readAccountSignPos () {
  return readJSONFile('signs.txt')
}

function writeAccountSignPos (signs) {
  return writeJSONFile('signs.txt', signs)
}

function readAccountCoins () {
  return readJSONFile('mobcoins.txt')
}

function writeAccountCoins (coins) {
  return writeJSONFile('mobcoins.txt', coins)
}

function readAccountUsernames () {
  return readJSONFile('usernames.txt')
}

function writeAccountUsernames (usernames) {
  return writeJSONFile('usernames.txt', usernames)
}

function readAccountTimes () {
  return readJSONFile('times.txt')
}

function writeAccountTimes (times) {
  return writeJSONFile('times.txt', times)
}

function readJSONFile (file) {
  const dataFile = '../data/' + file
  if (!fs.existsSync(dataFile)) {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8') || '{}')
    }

    writeJSONFile(dataFile, {})
  }

  return JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
}

function writeJSONFile (file, object) {
  if (!fs.existsSync('../data')) {
    fs.mkdirSync('../data')
  }

  const dataFile = '../data/' + file
  fs.writeFileSync(dataFile, JSON.stringify(object, null, 2))
}

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const args = require('minimist')(
  process.argv.slice(2), {
    default: {
      accounts: '../accounts.txt'
    },
    alias: {
      accounts: ['a', 'acc']
    }
  })

require('./consolescreens.js')
const mineflayer = require('mineflayer')

const pvpwarsPlugin = require('./pvpwars.plugin.js')

const helper = require('./helper.js')
const table = require('./table.js')

const server = require('./settings.js').serverBlock

const readFileInterval = 30 * 1000
const startTime = (new Date()).getTime()

let totalMobCoinsCollected = 0

if (args.h) {
  console.log('Usage: node main.bot.js [--accounts file]')
  process.exit(1)
}

;(async function () {
  console.log('Starting the bot')
  console.log()

  helper.printDisabledAccounts(args.accounts)
  console.log()
  printTimes()

  while (true) {
    await collectMobCoinsAllAccounts()

    printTimes()

    const uptime = (new Date()).getTime() - startTime
    console.log('Total coins collected: ' + totalMobCoinsCollected)
    console.log('Total time spent: ' + toHumanTime(uptime))
    console.log('Average mobcoins per hour: ' +
      Math.floor(totalMobCoinsCollected / (uptime / (3600 * 1000))))

    await sleep(readFileInterval)
  }
})()

async function collectMobCoinsAllAccounts () {
  const accounts = helper.readAccounts(args.accounts)
    .map(acc => {
      acc.timeLeft = getTimeToRun(acc.username)
      return acc
    })
    .filter(acc => acc.timeLeft <= 0)
    .sort((a, b) => b.timeLeft - a.timeLeft)
    .map((acc, index) => {
      acc.index = index
      return acc
    })

  for (const acc of accounts) {
    const username = acc.username
    const password = acc.password

    const bot = mineflayer.createBot({
      host: 'pvpwars.net',
      port: 25565,
      username: username,
      password: password,
      version: '1.8',
      verbose: true,
      plugins: {
        pvpwarsPlugin
      }
    })

    console.log()
    console.log('--- ' + username + ' ---')

    bot.once('login', () => {
      console.log('Username: ' + bot.username)
    })

    try {
      await bot.pvpwars.selectServer(server)
      await sleep(1500)
      await bot.pvpwars.activateSign()

      resetFails(username)
    } catch (err) {
      console.error(err)
      const fails = increaseFails(username)

      if (fails > 8) {
        helper.disableAccount(username)
      }
    } finally {
      updateUsername(username, bot.username)
      updateTimeToRun(username, bot.mobCoin.nextSignTime)
      totalMobCoinsCollected += (bot.mobCoin.collected || 0)

      console.log('Disconnecting from minecraft')
      await bot.disconnectSafely()
    }

    console.log('--- /' + username + ' ---')
    console.log()
    console.log((acc.index + 1) + ' of ' + accounts.length)
    await sleep(5000)
  }
}

function toHumanTime (ms) {
  let secs = ms / 1000
  let mins = secs / 60
  let hours = mins / 60
  let days = hours / 24

  secs %= 60
  mins %= 60
  hours %= 24

  secs = Math.floor(secs)
  mins = Math.floor(mins)
  hours = Math.floor(hours)
  days = Math.floor(days)

  let res = ''
  if (days) res += days + ' days '
  if (days || hours) res += hours + ' hours '
  if (days || hours || mins) res += mins + ' mins'
  // if (secs) res += secs.toString().padStart(2, '0')

  return res
}

function updateUsername (email, username) {
  if (!email || !username) return

  const usernames = helper.readAccountUsernames() // One could cache this
  usernames[email] = usernames[email] || {}

  usernames[email].username = username
  helper.writeAccountUsernames(usernames)
}

function updateTimeToRun (username, time) {
  time = time || ((new Date()).getTime() + 5 * 60 * 1000)
  const times = helper.readAccountTimes() || {}

  times[username] = times[username] || {}
  times[username].timetorun = time +
    Math.floor(Math.random() * 5 * 60 * 1000) *
    Math.floor(Math.pow(2, times[username].failsInARow || 0) * Math.random())

  helper.writeAccountTimes(times)
}

function resetFails (username) {
  const times = helper.readAccountTimes() || {}

  times[username] = times[username] || {}
  times[username].failsInARow = 0

  helper.writeAccountTimes(times)
}

function increaseFails (username) {
  const times = helper.readAccountTimes() || {}

  times[username] = times[username] || {}
  times[username].failsInARow = times[username].failsInARow || 0
  times[username].failsInARow++

  helper.writeAccountTimes(times)

  return times[username].failsInARow
}

function printTimes () {
  console.log()
  const usernames = helper.readAccountUsernames()
  const times = helper.readAccountTimes()

  let accounts = helper.readAccounts(args.accounts)
    .map(acc => {
      const user = usernames[acc.username] ? usernames[acc.username].username : ''
      const time = times[acc.username]
      acc.email = acc.username

      acc.username = user
      acc.failures = (time && time.failsInARow) ? time.failsInARow : 0
      acc.timeLeft = getTimeToRun(acc.email)

      return acc
    })

  accounts = accounts.sort((a, b) => a.failures - b.failures)
  logTimes('tf', accounts)

  accounts = accounts.sort((a, b) => b.timeLeft - a.timeLeft)
  logTimes('tt', accounts)
}

function logTimes (screen, obj) {
  const maxEmailLength = obj.reduce((acc, a) => Math.max(acc, a.email.length), 0)
  const maxTimeLength = obj.reduce((acc, a) =>
    Math.max(acc, Math.floor(a.timeLeft / (60 * 1000)).toString().length), 0)

  const accounts = obj.map(a => {
    const t = Math.floor(a.timeLeft / (60 * 1000))
    return {
      email: helper.color(a.email.padEnd(maxEmailLength), colors.Fg.Green),
      time: helper.color((t + 'min').padStart(maxTimeLength + 3), colors.Fg.Blue),
      username: a.username,
      fails: a.failures
    }
  })
  console.logScreen(screen, table(accounts, '#'))
}

function getTimeToRun (username) {
  const times = helper.readAccountTimes() // One could cache this

  return !times[username] ? 0
    : (times[username].timetorun - (new Date()).getTime())
}

const console = require('./consolescreens.js')

const mineflayer = require('mineflayer')

const table = require('./table.js')
const colors = require('./colors.js')

const pvpwarsPlugin = require('./pvpwars.plugin.js')

const helper = require('./helper.js')

const username = require('./settings').spectator.username
const password = require('./settings').spectator.password
const server = require('./settings.js').serverBlock

let watchDogReset = false
let lastCmds = []
let lastCmdTime = 0

setInterval(() => {
  if (watchDogReset) {
    process.stdout.write('Timeout triggered')
    process.exit()
  }

  watchDogReset = true
}, 2 * 60 * 1000)

;
(async function () {
  const usernames = helper.readUsernames()
  const coins = helper.readAccountCoins()

  printTableCoins(coins, usernames, 'a', 0)
  printTable(usernames, coins)

  const spectator = mineflayer.createBot({
    host: 'pvpwars.net',
    port: 25565,
    username: username,
    password: password,
    version: '1.8',
    verbose: true,
    plugins: {
      pvpwars: pvpwarsPlugin
    }
  })

  spectator.once('kicked', (reason) => {
    let cmds = lastCmds.reduce((acc, cmd) => acc + cmd, '')
    process.stdout.write('cmds ' + cmds)
    process.stdout.write('\nkicked ' + reason)
  })

  await spectator.pvpwars.selectServer(server)
  await sleep(1000)
  await spectator.pvpwars.getCommandAccess()
  await sleep(1000)

  await logShop(spectator)

  setInterval(async () => {
    await logShop(spectator)
  }, 1000 * 60 * 60 * 2)

  await sleep(5000)
  console.log('Waiting for players to join')
  spectator.on('playerJoined', onPlayerJoined)

  async function onPlayerJoined (player) {
    if (player.username.indexOf('§') !== -1) return

    lastCmds.push('/mobcoins viewcoins ' + player.username)
    if (lastCmds.length > 10) lastCmds.shift()
    spectator.chat('/mobcoins viewcoins ' + player.username
      .replace(/§[0-9a-flnmokr]/g, ''))
  }

  spectator.once('end', () => {
    console.log('Connection ended')
    process.stdout.write('Connecton ended')
    process.exit()
  })

  spectator.on('windowOpen', (window) => {
    if (window.title.toLowerCase().indexOf('coins') !== -1) { return }

    let items = window.slots.filter((item, index) => {
      if (!item) return false

      item.slot = index

      if (item.name === 'stained_glass_pane' || item.slot >= 36) { return false }

      item.desc = item.nbt.value.display.value.Name.value
        .replace(/§[0-9a-flnmokr]/g, '')

      console.log(item.slot + ' ' + item.name + ' ' + item.desc)

      return true
    })
    console.log(window.title, items.map(it => it.desc || it.displayName))
    process.stdout.write('Window opened')
    process.stdout.write(window.title, items.map(it => it.desc || it.displayName))
    process.exit()
  })

  spectator.chatAddPattern(/(.*)s Mob Coins:(.*)/, 'playerMobcoinCount')
  spectator.on('playerMobcoinCount', async (user, userCoins) => {
    const username = user.trim().slice(0, -1)
    const coin = parseInt(userCoins.trim().replace(',', ''))

    if (usernames.indexOf(username) === -1 &&
      new Date().getTime() - lastCmdTime < 1000) { return }

    coins[username] = coins[username] || {}
    if (coins[username].mobcoins < coin) { coins[username].lastCoinIncrease = (new Date()).getTime() }

    coins[username].mobcoins = coin
    coins[username].lastUpdated = (new Date()).getTime()

    console.log(helper.randColor('XXXX') + '\x1B[1A')

    helper.writeAccountCoins(coins)
    watchDogReset = false
    lastCmdTime = new Date().getTime()
  })

  setInterval(() => {
    printTable(usernames, coins)
  }, 15 * 1000)

  setInterval(() => {
    printTableCoins(coins, usernames, 'a', 0)
  }, 60 * 2 * 1000)

  setInterval(async () => {
    try {
      await moveRandom(spectator)
    } catch (err) {}
  }, 60 * 1000)

  setInterval(async () => {
    try {
      await viewAllMobcoins(spectator, 4000)
    } catch (err) {}
  }, 6 * 60 * 60 * 1000)

  setTimeout(async () => {
    try {
      await viewAllMobcoins(spectator, 4000)
    } catch (err) {}
  })
})()

async function viewAllMobcoins (bot, delay) {
  const usernames = Object.keys(bot.players)

  for (const username of usernames) {
    bot.chat('/mobcoins viewcoins ' + username)
    await sleep(delay)
  }
}

async function moveRandom (spectator) {
  const baseTime = 200; const jitter = 300
  const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump' ]

  let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]

  spectator.setControlState(ctl, true)
  await sleep(baseTime + Math.random() * jitter)

  if (Math.random() > 0.4) {
    spectator.look(
      Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2)

    await sleep(baseTime * 2 + Math.random() * jitter)
  }

  spectator.setControlState(ctl, false)
}

function printTable (usernames, coins) {
  let obj = {}
  usernames.forEach(u => {
    obj[u] = coins[u]
  })
  printTableCoins(obj, usernames)
}

function printTableCoins (coins, usernames, screenPrefix, time = 120) {
  screenPrefix = screenPrefix || ''
  let coinKeys = Object.keys(coins)
  let arr = []

  for (let username of coinKeys) {
    if (!coins[username] || !coins[username].lastUpdated) continue

    const now = (new Date()).getTime()
    const lastUpdatedMins = Math.floor((now - coins[username].lastUpdated) /
      (1000 * 60))

    const lastInc = Math.floor(
      (now - (coins[username].lastCoinIncrease || 0)) / (1000 * 60))

    if (time && lastUpdatedMins > time) continue

    arr.push({
      username: username,
      mobcoins: coins[username].mobcoins,
      mins: lastUpdatedMins,
      lastInc: lastInc
    })
  }

  arr.sort((a, b) => a.mins - b.mins)
  logTables(screenPrefix + 'tm', usernames, arr)
  arr.sort((a, b) => a.lastInc - b.lastInc)
  logTables(screenPrefix + 'tl', usernames, arr)
  arr.sort((a, b) => a.mobcoins - b.mobcoins)
  logTables(screenPrefix + 'tc', usernames, arr)
}

function logTables (screen, usernames, obj) {
  let arr = obj.filter(() => true)
  const tot = arr.length === 0 ? 0
    : arr.map(a => a.mobcoins)
      .reduce((a, b) => a + b)

  arr.push({ username: '' })
  arr.push({ username: 'Average', mobcoins: Math.floor(tot / (arr.length - 1)) })
  arr.push({ username: 'Total', mobcoins: tot })

  let maxUnLen = arr.reduce((acc, a) => Math.max(acc, a.username.length), 0)

  arr = arr.map(a => ({
    username: usernames.indexOf(a.username) !== -1
      ? helper.color((a.username || '').padEnd(maxUnLen), colors.Fg.Green)
      : helper.color((a.username || '').padEnd(maxUnLen), colors.Fg.Blue),
    mobcoins: helper.color(a.mobcoins, colors.Fg.Yellow),
    mins: a.mins !== a.lastInc
      ? helper.color(a.mins, colors.Fg.Red)
      : a.mins,
    'last inc': a.lastInc > 100000 ? '---' : a.lastInc
  }))

  console.logScreen(screen, table(arr, ''))
  console.log(helper.randColor('XXXX') + '\x1B[1A')
}

async function logShop (spectator) {
  const items = await spectator.pvpwars.parseMobcoinShop(createToken(0))
  const tbl = {}
  for (const item of items) {
    tbl[item.slot] = {
      text: helper.color(item.desc, colors.Fg.Magenta),
      price: helper.color(item.price, colors.Fg.Yellow),
      item: item.name
    }
  }

  console.logScreen('shop', table(tbl, '#'))
}

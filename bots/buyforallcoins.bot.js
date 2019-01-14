require('./consolescreens.js')
let readline = require('readline')
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

const mineflayer = require('mineflayer')

const pvpwarsPlugin = require('./pvpwars.plugin.js')

const server = require('./settings.js').serverBlock

const helper = require('./helper.js')
const table = require('./table.js')

;(async function () {
  let item = await getItemToBuy()
  await buyItemOnAllAccounts(item)
})()

async function buyItemOnAllAccounts (item) {
  let accounts = helper.readAccounts()

  for (let acc of accounts) {
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
    console.log()

    try {
      await bot.pvpwars.selectServer(server)
      await bot.pvpwars.getCommandAccess()
      await sleep(1000)
      console.log()
      await buyItem(bot, item)
    } catch (err) {
      console.log(err)
    } finally {
      console.log('Disconnecting player ' + bot.username)
      await bot.disconnectSafely()
    }

    console.log()
    console.log('--- /' + username + ' ---')
    console.log()

    await sleep(10000)
  }
}

async function getItemToBuy () {
  console.log('Lets buy stuff for mobcoins!')
  console.log()
  let accounts = helper.readAccounts()

  let master = accounts.filter(a => a.isMaster)
  if (!master) {
    return 'There is no master defined! Add a semicolon (username:password:) to set the master'
  }

  master = master[0]

  const masterBot = mineflayer.createBot({
    host: 'pvpwars.net',
    port: 25565,
    username: master.username,
    password: master.password,
    version: '1.8',
    verbose: true,
    plugins: {
      pvpwarsPlugin
    }
  })

  await masterBot.pvpwars.selectServer(server)
  await masterBot.pvpwars.getCommandAccess()

  const items = await masterBot.pvpwars.parseMobcoinShop()
  await masterBot.disconnectSafely()

  const tbl = {}
  for (const item of items) {
    tbl[item.slot] = {
      text: helper.color(item.desc, colors.Fg.Magenta),
      price: helper.color(item.price, colors.Fg.Yellow),
      item: item.name
    }
  }

  console.log(table(tbl, '#'))

  return new Promise((resolve, reject) => {
    rl.on('line', onLine)
    console.log('Please enter a number')

    async function onLine (line) {
      try {
        let choice = parseInt(line)
        let item = items.filter(it => it.slot === choice)[0]

        console.log('Selected item: ' + item.desc)
        rl.off('line', onLine)
        resolve(item)
      } catch (err) {
        console.log('Could not parse the choice ' + line +
          ' got error ' + err.message)
        console.log('Please enter a new number')
      }
    }
  })
}

async function buyItem (bot, item, count = 1) {
  bot.chatAddPattern(/You have purchased/, 'mobcoinShopped')
  bot.chatAddPattern(/Mob Coins to purchase this./, 'mobcoinNotEnough')

  if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

  return new Promise((resolve, reject) => {
    let windowHasOpenend = false
    setTimeout(() => {
      if (windowHasOpenend) return
      reject(new Error('Timeout: Could not open mobcoin window'))
    }, 10 * 1000)

    bot.chat('/mobcoins')
    bot.once('windowOpen', onWindowOpen)

    async function onWindowOpen (window) {
      windowHasOpenend = true
      let waitForBuy = true
      await sleep(500)

      bot.once('mobcoinShopped', onMobcoinShopped)
      bot.once('mobcoinNotEnough', onMobcoinNotEnough)

      async function onMobcoinShopped () {
        bot.off('mobcoinNotEnough', onMobcoinNotEnough)
        waitForBuy = false

        console.log('\x1B[1ABought ' + helper.color(count, colors.Fg.Blue) +
          'x ' + helper.color(item.desc, colors.Fg.Magenta))

        for (let i = 1; i < 7; i++) {
          try {
            await buyItem(bot, item, count + 1)
            break
          } catch (err) {
            if (i > 3) console.log(err.message)
            if (i > 5) console.log(err)
          }
        }
        resolve()
      }

      async function onMobcoinNotEnough () {
        bot.off('mobcoinShopped', onMobcoinShopped)
        waitForBuy = false

        console.log('Not enough mob coins to buy more items!')
        resolve()
      }

      setTimeout(async () => {
        let tries = 2
        while (waitForBuy && --tries > 0) {
          waitForBuy = !!waitForBuy
          try {
            await waitForBuyClick(bot, item)
            return
          } catch (err) {
            await sleep(500)
          }
        }

        bot.off('mobcoinShopped', onMobcoinShopped)
        bot.off('mobcoinNotEnough', onMobcoinNotEnough)

        if (!waitForBuy) return

        console.log('Someting went wrong, aborting ' + window.title)
        reject(new Error('Could not buy item'))
      })
    }
  })
}

async function waitForBuyClick (bot, item) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      bot.off('mobcoinShopped', resolve)
      bot.off('mobcoinNotEnough', resolve)

      reject(new Error('Timeout: Buy click'))
    }, 1200)

    bot.once('mobcoinShopped', resolve)
    bot.once('mobcoinNotEnough', resolve)

    bot.clickWindow(item.slot, 0, 0, (err) => {
      if (err) console.error(err)
    })
  })
}

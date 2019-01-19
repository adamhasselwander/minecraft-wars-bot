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
const server = require('./settings.js').serverBlock

const mode = args._[0]
if (!(mode === 'inv' || mode === 'coins') || args.h) {
  console.log('Usage: node dropper.bot.js <inv|coins> [--accounts file]')
  process.exit(1)
}

;(async function () {
  await dropAllAccounts(mode)
  process.exit(1)
})()

async function dropAllAccounts (mode) {
  console.log('We are going to drop stuff!')
  console.log()

  const master = helper.readAccounts(args.accounts).filter(a => a.isMaster)[0]
  if (!master) {
    throw new Error('There is no master defined!' +
      ' Add a semicolon (username:password:) to set the master')
  }

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

  masterBot.pvpwars.acceptAllTps()
  masterBot.pvpwars.runAllCommands()

  masterBot.chatAddPattern(/me.*drop inv (.*)/, 'dropInv')
  masterBot.on('dropInv', (user) => {
    if (user && user.trim()) {
      user = user.trim()
      const p = masterBot.players[user]

      if (!p) {
        console.log('Could not find user to look at ' + user)
      } else {
        masterBot.lookAt(
          p.entity.position.offset(0, masterBot.entity.height / 2, 0))
      }
    }

    masterBot.pvpwars.tossInventory()
  })

  try {
    await masterBot.pvpwars.selectServer(server)
  } catch (err) {
    console.error(err)
    console.log('Could not login with the master')
    return
  }

  console.log('Master loggedin')

  await sleep(1000)
  await masterBot.pvpwars.goHome()
  await sleep(1000)
  const homePos = masterBot.entity.position

  let depositId =
    setTimeout(depositMobCoins, 7 * 1000 + Math.random() * 1000 * 5)

  async function depositMobCoins () {
    if (mode !== 'coins') return

    console.log('Depositing mobcoins')
    const coinsInInventory = masterBot.inventory.items()
      .filter(item => item.displayName.indexOf('unflower') !== -1)
      .map(item => item.count).reduce((a, b) => a + b, 0)

    const coinsToDeposit = coinsInInventory - Math.floor(Math.random() * 200)

    if (coinsToDeposit > 100) {
      console.log('Total mobcoins in inventory: ' + coinsInInventory +
        ' coins to deposit: ' + coinsToDeposit)
      masterBot.chat('/mobcoins deposit ' + coinsToDeposit)
    }

    depositId = setTimeout(depositMobCoins, 7 * 1000 + Math.random() * 1000 * 5)
  }
  const accounts = helper.readAccounts(args.accounts)
    .map((acc, index) => {
      acc.index = index
      return acc
    })

  for (const acc of accounts) {
    if (acc.username === master.username) continue

    if (masterBot.entity.position.distanceTo(homePos) > 10) {
      console.log('Master seems to have moved away from home, telporting back')
      await masterBot.pvpwars.goHome()
    }

    console.log()
    console.log()
    console.log('--- Dropping for ' + acc.username + ' ---')

    const slaveBot = mineflayer.createBot({
      host: 'pvpwars.net',
      port: 25565,
      username: acc.username,
      password: acc.password,
      version: '1.8',
      verbose: true,
      plugins: {
        pvpwarsPlugin
      }
    })

    try {
      await slaveBot.pvpwars.selectServer(server)

      if (mode === 'coins') {
        await slaveBot.dropMobCoins(masterBot)
        console.log('Done dropping coins for ' + slaveBot.username)
      } else if (mode === 'inv') {
        const emptyStacks = masterBot.inventory.slots.filter(it => !it).length - 9
        if (emptyStacks <= 0) break

        console.log('Max stacks to drop: ' + emptyStacks)
        await slaveBot.pvpwars.dropInventory(masterBot)
        console.log('Done dropping inventory for ' + slaveBot.username)
      }
    } catch (err) {
      console.error(err)
      console.log('There was an error, it is printed above')
    } finally {
      console.log('Disconnecting pawn')
      await slaveBot.disconnectSafely()
    }

    console.log('--- /Dropping for ' + acc.username + ' ---')
    console.log()
    console.log((acc.index + 1) + ' of ' + accounts.length)
    await sleep(6000)
    console.log()
  }

  clearTimeout(depositId)

  console.log()
  console.log('Done!!')
  await sleep(60 * 1000)

  console.log('Disconnecting master')

  await masterBot.pvpwars.goHome()
  await sleep(1000)

  await masterBot.disconnectSafely()
}

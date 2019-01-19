const args = require('minimist')(
  process.argv.slice(2), {
    default: {
      accounts: '../afk.txt'
    },
    alias: {
      accounts: ['a', 'acc'],
      activatepet: ['ap']
    }
  })

require('./consolescreens.js')
const mineflayer = require('mineflayer')

const pvpwarsPlugin = require('./pvpwars.plugin.js')

const server = require('./settings.js').serverBlock
const helper = require('./helper.js')

const bots = [] // I fear the bots will be garbage collected if i don't do this.
const retryDelay = 5 * 60 * 1000

if (args.h) {
  console.log('Usage: node afk.bot.js [--accounts file] [--activatepet]')
  process.exit(1)
}

;(async function () {
  console.log('Starting the bot')
  console.log()

  const accounts = helper.readAccounts(args.accounts)

  for (const acc of accounts) {
    const username = acc.username
    const password = acc.password

    await retryLogin(username, password)
    await sleep(1000)
  }
})()

function onEnd () {
  console.log('Bot ' + this.username + ' was disconnected')

  this.removeAllListeners()
  this._client.removeAllListeners()

  clearInterval(this.petActivateId)
  clearTimeout(this.petActivateTimerId)

  setTimeout(async () => {
    await retryLogin(this.email, this.password)
  }, retryDelay)
}

async function activatePet (bot) {
  if (!args.activatepet) return

  const pets = bot.inventory.slots
    .filter(it => it && it.type === 397 && it.slot >= 36)
    .filter(it => it.nbt.value.display.value.Name.value.indexOf('Pet') !== -1)

  if (pets.length === 0) {
    console.log('Found no pet')
    return
  }

  console.log('Found ' + pets.length + ' pets')

  const pet = pets[0]
  const slot = pet.slot - 36
  console.log('Activating pet at slot ' + slot +
   ' with name ' + pet.nbt.value.display.value.Name.value)

  bot.setQuickBarSlot(slot)
  await sleep(150)
  bot.setQuickBarSlot(slot)
  await sleep(100)

  bot.activateItem()
  await sleep(1000)
  bot.activateItem()
}

async function retryLogin (email, password) {
  const bot = mineflayer.createBot({
    host: 'pvpwars.net',
    port: 25565,
    username: email,
    password: password,
    version: '1.8',
    verbose: true,
    plugins: {
      pvpwarsPlugin
    }
  })

  bot.email = email
  bot.password = password

  console.log()
  console.log('--- ' + email + ' ---')

  bot.on('login', () => {
    console.log('Username: ' + bot.username)
  })

  bot.petActivateId = setInterval(async () => {
    await activatePet(bot)
  }, 60 * 5 * 1000)

  bot.chatAddPattern(/me.*get cmd access/, 'getcmdaccess')
  bot.once('getcmdaccess', () => {
    bot.pvpwars.getCommandAccess()
  })

  bot.chatAddPattern(/This(.*)Pet is still on cooldown for (.*) seconds/, 'petcooldown')

  bot.on('petcooldown', (type, cd) => {
    let secs

    try {
      secs = parseInt(cd.split('.')[0].trim(), 10)
    } catch (err) {
      console.error(err)
      console.log('Could not convert cooldown to seconds ' + cd)
      return
    }

    console.log('Added timer for next pet activation cooldown ' + secs)

    clearTimeout(bot.petActivateTimerId)
    bot.petActivateTimerId = setTimeout(async () => {
      await activatePet(bot)
    }, (secs + 2) * 1000)
  })

  bot.chatAddPattern(/me.*drop inv (.*)/, 'dropInv')
  bot.on('dropInv', (user) => {
    if (user && user.trim()) {
      user = user.trim()
      const p = bot.players[user]

      if (!p) {
        console.log('Could not find user to look at ' + user)
      } else {
        bot.lookAt(
          p.entity.position.offset(0, masterBot.entity.height / 2, 0))
      }
    }

    bot.pvpwars.tossInventory()
  })

  try {
    await bot.pvpwars.selectServer(server)
    bot.pvpwars.runAllCommands()
    bots.push(bot)
    bot.on('end', onEnd)
    console.log('Bot ' + bot.username + ' successfully loggedin')
  } catch (err) {
    console.error(err)
    console.log('Disconnecting from minecraft')
    await bot.disconnectSafely()

    setTimeout(async () => {
      await retryLogin(email, password)
    }, retryDelay)
  }

  await activatePet(bot)
}

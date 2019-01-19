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

const server = require('./settings.js').serverBlock
const helper = require('./helper.js')

;(async function () {
  console.log('Starting the bot')
  console.log()

  const accounts = helper.readAccounts(args.accounts).filter(acc => acc.isMaster)

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

    bot.on('login', () => {
      console.log('Username: ' + bot.username)
    })

    try {
      await bot.pvpwars.selectServer(server)
      await bot.pvpwars.getCommandAccess()
      await bot.pvpwars.goHome()
      await bot.pvpwars.acceptAllTps()

      await levelDupePet(bot)
    } catch (err) {
      console.log(err)
      console.log('Disconnecting from minecraft')
      await bot.disconnectSafely()
    }

    await sleep(1000)
  }
})()

async function levelDupePet (bot) {
  bot.chatAddPattern(/.\/is coop (.*)/, 'isCoop')
  bot.on('isCoop', (msg) => {
    let username = msg.trim().split(' ')[0].trim()

    bot.chat('/is coop ' + username)
    console.log('Sending /is coop ' + username)
    console.log("'" + msg + "'")
  })

  console.log('Waiting for some time')
  await sleep(30 * 1000)
  console.log(bot.inventory.slots.filter(it => it).map(it => JSON.stringify(it.nbt)))
  await sleep(10 * 1000)
  // start with only one type of spawners.
  // Start with one stack and one stac placed.

  // while true:
  //  spawners
  //  if first hand is not empty move item to empty space in inventory
  //  get all spawners near us
  //  create a map<spawner, count>
  //  for each spawners near
  //   while there is a stack of the type same type in the inventory
  //    increase the map<spawner> += stack.count
  //    place all spawners in the stack onto the spawners nearby
  //   end
  //  end
  // mine count spawners of every type

  const refSpawner = bot.findBlock({
    matching: it => it && it.type === 52,
    maxDistance: 3
  })
  console.log(refSpawner)

  while (true) {
    bot.setQuickBarSlot(0)
    await sleep(100)
    bot.putAway(0)
    await sleep(100)

    let totalCount = 0
    while (true) {
      const spawners = bot.inventory.slots
        .filter(it =>
          it &&
          it.type === refSpawner.type &&
          it.metadata === refSpawner.metadata)[0]

      if (!spawners) break

      console.log(spawners)

      bot.transfer({
        sourceStart: spawners.slot,
        destStart: 36,
        itemType: spawner.type,
        metadata: spawner.metadata

      }, (err) => {
        if (err) console.log(err)
      })

      await sleep(1500)
      totalCount += spawners.count

      let i = 0
      while (bot.inventory.slots[36] && bot.inventory.slots[36].count) {
        bot.placeBlock(refSpawner, new Vec3(0, 1, 0))
        await sleep(500)
        if (i++ > 64 * 2) {
          console.log('Could not place spawners')
          break
        }
      }
    }

    // put pickaxe in first slot
    const pick = bot.inventory.slots.filter(it => it && it.name.indexOf('pickaxe') === -1)[0]
    bot.transfer({
      sourceStart: pick.slot,
      destStart: 36,
      itemType: pick.type,
      metadata: pick.metadata
    }, (err) => {
      if (err) console.log(err)
    })

    await (1500)

    while (totalCount--) {
      await digBlock(bot, refSpawner)
      await (100)
    }
  }
}

function digBlock (bot, block) {
  return new Promise((resolve, reject) => {
    bot.dig(block, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

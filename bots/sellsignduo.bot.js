require('./consolescreens.js')
const mineflayer = require('mineflayer')
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer)

const loginBot = require('./login.bot.js')
const helper = require('./helper.js')

const username = require('./settings.js').sell.username
const password = require('./settings.js').sell.password

;
(async function () {
  console.log('Starting the bot')
  console.log()

  const bot = mineflayer.createBot({
    host: 'pvpwars.net',
    port: 25565,
    username: username,
    password: password,
    version: '1.8',
    verbose: true
  })

  bot.loadPlugin(blockFinderPlugin)

  bot.on('login', onLogin)
  function onLogin () {
    bot.removeListener('login', onLogin)
    console.log('Username: ' + bot.username)
  }

  try {
    await loginBot.waitForErrors(bot)
    await loginBot.spawnAndLogin(bot)
    // await movearoundBot.moveAroundUntilCommandAccess(bot)
    await sleep(1000)
    await clickSignsForever(bot)
  } catch (error) {
    console.log(error)
  } finally {
    console.log('Disconnecting from minecraft')
    await helper.disconnectSafely(bot)
  }
})()

async function clickSignsForever2 (bot, sellSign, shopSign) {
  return new Promise((resolve, reject) => {
    bot.chatAddPattern(/Money.*Pet is still on cooldown for(.*)seconds/, 'activatedPet')
    bot.on('activatedPet', (time) => {
      console.log('Activated money pet ' + time)
    })
    let lastActivated = 0
    let petIndex = 0

    bot.lookAt(sellSign.position.offset(0, 2, 0))

    setTimeout(async () => {
      console.log(sellSign.signText, shopSign.signText)
      // bot.chat('/tpa Trasselwander')
      // await sleep(10 * 1000)
      // await sleep(10 * 1000)
      // bot.chat('/is coopaccept')
      // await sleep(10 * 1000)
      // bot.chat('/is coopaccept')
      // await sleep(10 * 1000)
      const skulls = bot.inventory.slots
        .filter(it => it && it.type === 397 && it.slot >= 36)
        .filter(it => it.nbt.value.display.value.Name.value.indexOf('Money') !== -1)

      while (true) {
        if (new Date().getTime() - lastActivated > 60 * 1000) {
          console.log('Activating money pet')

          bot.setQuickBarSlot(skulls[petIndex].slot - 36)
          await sleep(500)
          bot.setQuickBarSlot(skulls[petIndex].slot - 36)
          await sleep(500)
          petIndex = (petIndex + 1) % skulls.length

          // leftclick in the air to activate the pet
          bot.activateBlock(bot.blockAt(sellSign.position.offset(0, 2, 0)))
          await sleep(500)
          bot.activateBlock(bot.blockAt(sellSign.position.offset(0, 1, 0)))

          lastActivated = new Date().getTime()
        }

        bot.activateBlock(sellSign)
        await sleep(1000)
        bot.activateBlock(shopSign)
        await sleep(1000)
      }
    })
  })
}

async function clickSignsForever (bot) {
  return new Promise((resolve, reject) => {
    bot.findBlock({
      point: bot.entity.position,
      matching: 68,
      maxDistance: 5,
      count: 2
    }, async (err, blocks) => {
      if (err) {
        console.log('There was an error when searching for signs')
        return
      }

      if (blocks.length !== 2) {
        console.log('Only found some sign ' + blocks.length)
        return
      }

      const sellSign = (blocks[0].signText || '')
        .toLowerCase().indexOf('sell sign') !== -1
        ? blocks[0] : blocks[1]

      const shopSign = blocks.filter(b => b !== sellSign)[0]

      await clickSignsForever2(bot, sellSign, shopSign)
      resolve()
    })
  })
}

const helper = require('./helper.js')
const movearoundBot = require('./movearound.bot.js')
const vec3 = require('vec3')

module.exports.getSign = getSign

async function getSign (bot) {
  console.log('Signs')
  await movearoundBot.goHome(bot)

  await sleep(500)

  const sign = bot.findBlock({
    matching: (it) => it && it.name.indexOf('sign') !== -1
  })

  if (sign) return

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout: shopping'))
    }, 60 * 1000)

    bot.once('windowOpen', async (window) => {
      bot.once('windowOpen', async (window) => {
        try {
          console.log('Another window!!')

          await sleep(300)
          await helper.clickItemDesc(bot, window, '+1')
          await sleep(400)
          await helper.clickItemDesc(bot, window, 'CONFIRM')

          bot.chatAddPattern(/You successfully bought/, 'shopped')
          bot.once('shopped', async () => {
            console.log('Chopped some wood, will try to craft')

            try {
              bot.closeWindow(window)

              await waitForItem(bot, 'log', 2)
              await helper.craftItem(bot, 'planks', 2)

              await waitForItem(bot, 'planks', 8)
              await helper.craftItem(bot, 'stick', 1)

              await waitForItem(bot, 'stick', 1)
              await helper.craftItem(bot, 'sign', 1)

              await waitForItem(bot, 'sign', 1)
              await placeSign(bot)
              resolve()
            } catch (err) {
              reject(err)
            }
          })
        } catch (err) {
          reject(err)
        }
      })

      try {
        console.log('Shop open, clicking stuff')
        await sleep(500)
        await helper.clickItemDesc(bot, window, 'Oak wood')
      } catch (err) {
        reject(err)
      }
    })

    bot.chat('/shop blocks')
  })
}

async function waitForItem (bot, name, amount) {
  for (let i = 1; i < 15; i++) {
    let c = bot.inventory.items()
      .filter(it => it.name === name).map(it => it.count)

    if (c.length > 0 &&
      c.reduce((a, b) => a + b) >= amount) {
      return
    }

    await sleep(200)
  }
}

async function placeSign (bot) {
  // We have a sign in inventory and are on our is.

  let item = bot.inventory.slots.filter((it, index) => {
    if (!it) return false
    it.slot = index
    return it.name === 'sign'
  })[0]

  for (let i = 1; i < 10; i++) {
    if (item) break

    await sleep(200)
    item = bot.inventory.slots.filter((it, index) => {
      if (!it) return false
      it.slot = index
      return it.name === 'sign'
    })[0]
  }

  if (!item) {
    throw new Error('Could not find the sign')
  }

  bot.setQuickBarSlot(item.slot - 36)

  // The sign is in our hand

  await sleep(1000)
  bot.placeBlock(bot.blockAt(bot.entity.position.offset(0, -1, 0)),
    vec3(0, 1, 0), () => {
      console.log('Block placed')
    })

  await sleep(2000)
  console.log('Placed a sign')

  const signBlock = bot.findBlock({
    matching: (it) => it && it.name.indexOf('sign') !== -1
  })

  bot.updateSign(signBlock, '[mobcoin]\n\n\n')
}

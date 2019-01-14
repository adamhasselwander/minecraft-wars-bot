const helper = require('./helper.js')
const commonPlugin = require('./common.plugin.js')
const vec3 = require('vec3')

module.exports = inject

// TODO:
// Calling method responsible for timeout and bot.on('error')

function inject (bot) {
  bot.loadPlugin(commonPlugin)

  bot.mobCoin = {}

  // All methods are async
  // All methods should take a token and gracefully handle
  // when token completed is set to true.

  bot.pvpwars = {
    selectServer: (server) => selectServer(bot, server),
    goHome: () => goHome(bot),
    getCommandAccess: () => getCommandAccess(bot),
    activateSign: () => activateSign(bot),
    getSign: () => getSign(bot),
    viewMobCoins: () => viewMobCoins(bot),
    dropMobCoins: (masterBot) => dropMobCoins(masterBot, bot),
    dropInventory: (masterBot) => dropInventory(masterBot, bot),
    tossInventory: (options) => tossInventory(bot, options),
    parseMobcoinShop: () => parseMobcoinShop(bot),
    parseIsTop: () => parseIsTop(bot)
  }
}

async function parseIsTop (bot) {
  console.log('Executing /is top')
  bot.chat('/is top')

  const window = await _waitForWindow(bot, '')
  console.log('Is top openend with title: ' + window.title)

  await sleep(1000)

  const items = window.slots.filter((item, index) => {
    if (!item) return false

    item.slot = index

    if (item.name === 'stained_glass_pane' || item.slot >= 36) { return false }

    const nbtDisp = item.nbt.value.display
    if (nbtDisp.value.Name) {
      item.desc = nbtDisp.value.Name.value
        .replace(/§[0-9a-flnmokr]/g, '')
    }

    if (nbtDisp.value.Lore) {
      const nbtLore = nbtDisp.value.Lore
      if (nbtLore.value.value) {
        for (const lore of nbtDisp.value.Lore.value.value) {
          if (lore.toLowerCase().indexOf('worth') !== -1) {
            item.price = lore
              .replace(/§[0-9a-flnmokr]/g, '')
          }
          if (lore.toLowerCase().indexOf('members') !== -1) {
            item.price = lore
              .replace(/§[0-9a-flnmokr]/g, '')
          }
          if (lore.toLowerCase().indexOf('place') !== -1) {
            item.price = lore
              .replace(/§[0-9a-flnmokr]/g, '')
          }
          if (lore.toLowerCase().indexOf('island level') !== -1) {
            item.price = lore
              .replace(/§[0-9a-flnmokr]/g, '')
          }
        }
      }
    }

    return !!item.desc
  })

  bot.closeWindow(window)
  return items
}

async function parseMobcoinShop (bot) {
  console.log('Executing /mobcoins')
  bot.chat('/mobcoins')

  const window = await _waitForWindow(bot, 'Mob Coins')
  console.log('Mobcoin shop opened')

  await sleep(1000)

  const items = window.slots.filter((item, index) => {
    if (!item) return false

    item.slot = index

    if (item.name === 'stained_glass_pane' || item.slot >= 36) { return false }

    const nbtDisp = item.nbt.value.display
    if (nbtDisp.value.Name) {
      item.desc = nbtDisp.value.Name.value
        .replace(/§[0-9a-flnmokr]/g, '')
    } else {
      item.desc = item.displayName
    }

    if (nbtDisp.value.Lore) {
      const nbtLore = nbtDisp.value.Lore
      if (nbtLore.value.value) {
        for (const lore of nbtDisp.value.Lore.value.value) {
          if (lore.toLowerCase().indexOf('price') !== -1) {
            try {
              item.price = parseInt(lore
                .replace(/§[0-9a-flnmokr]/g, '')
                .split(' ')
                .pop()
                .replace(/\D/g, ''))
            } catch (err) {

            }
          }
        }
      }
    }

    return !!item.price
  })

  bot.closeWindow(window)
  return items
}

async function goHome (bot) {
  await getCommandAccess(bot)
  bot.clearControlStates()

  bot.chatAddPattern(/Teleporting you to your island/, 'home')
  bot.chatAddPattern(/You do not have an island/, 'missingHome')

  const homePromise = _waitFor(bot, 'home')
    .then(onHome)
  const noHomePromise = _waitFor(bot, 'missingHome')
    .then(onMissingHome)

  console.log('Trying to teleport home')
  bot.chat('/is home')
  bot.clearControlStates()

  // I think this is how to use promises
  await Promise.race([homePromise, noHomePromise])
  await sleep(400)

  async function onHome () {
    console.log('Telported home')
  }

  async function onMissingHome () {
    console.log('Missing a home to teleport to')

    bot.chat('/is')
    const window = await _waitForWindow(bot, '')

    console.log('is window opened with title ' + window.title)
    await sleep(600)

    await bot.clickItemDesc(window, 'Farmland')
    await _waitFor(bot, 'forcedMove')
    console.log('Teleported home!')
  }
}

async function getCommandAccess (bot) {
  if (bot.cmdAccess) {
    console.log('No need to move around, aldready has access')
    return
  }

  console.log('Moving around')

  const moveToken = createToken(30 * 1000)
  _moveRandom(bot, moveToken)

  bot.chatAddPattern(/Unknown command. Type/, 'unknownCmd')

  setTimeout(async () => {
    while (!moveToken.completed) {
      bot.chat('/')
      await sleep(1000 + Math.random() * 3000)
    }
  })

  try {
    await _waitFor(bot, 'unknownCmd', { token: moveToken })
  } catch (err) {
    moveToken.complete()
    bot.clearControlStates()
    throw err
  }

  moveToken.complete()
  bot.clearControlStates()

  console.log('Now able to send commands')
  bot.cmdAccess = true
}

async function activateSign (bot) {
  const pos = bot.entity.position

  const signPos = helper.getSignPosition(bot.username, pos)
  const distSign = pos.distanceTo(signPos)
  if (distSign > 6) {
    console.log('We are far away from our sign ' + distSign + ', teleporting home')
    await goHome(bot)
  } else if (distSign > 1) {
    console.log('Distance to sign ' + Math.floor(distSign))
  }

  const sign = _getMobcoinSign(bot)

  if (!sign) {
    console.log('Could not find the sign')
    await getSign(bot)
    await activateSign(bot)
    return
  }

  bot.chatAddPattern(/You must wait(.*)/, 'mobcoinTime')
  bot.chatAddPattern(/ve received(.*)Mob Coins/, 'mobcoinCount')

  bot.once('mobcoinCount', onMobcoinCount)

  const activateBlockToken = createToken(0)
  setTokenInterval(activateBlockToken, () => {
    bot.activateBlock(sign)
  }, 200)

  let msg

  try {
    const arr = await _waitFor(bot, 'mobcoinTime')
    msg = arr[0]
  } catch (err) {
    activateBlockToken.complete()
    throw err
  }

  console.log('Detected sign activation')
  activateBlockToken.complete()

  await sleep(200)
  bot.off('mobcoinCount', onMobcoinCount)

  const time = _parseMobCoinTime(msg)

  if (!time) return

  bot.mobCoin.nextSignTime = time.getTime()

  const timeMin = Math.floor((time.getTime() -
    (new Date()).getTime()) / (60 * 1000))
  console.log('Time until next reward ' + timeMin + 'min')

  async function onMobcoinCount (msg) {
    console.log('Found mobcoins to collect')
    helper.updateSignPosition(sign, bot.username)
    bot.mobCoin.collected = _parseMobCoinCount(msg)
  }
}

function _getMobcoinSign (bot) {
  return bot.findBlock({
    matching: (it) => it && it.name.indexOf('sign') !== -1,
    maxDistance: 4
  })
}

async function getSign (bot) {
  await goHome(bot)

  await sleep(500)

  const sign = _getMobcoinSign(bot)
  if (sign) return

  bot.chat('/shop blocks')

  const shopBlocksWindow = await _waitForWindow(bot, '')

  console.log('Shop open, clicking stuff')
  await sleep(500)
  await bot.clickItemDesc(shopBlocksWindow, 'Oak wood')

  const shopWoodWindow = await _waitForWindow(bot, '')

  console.log('Another window!!')

  await sleep(300)
  await bot.clickItemDesc(shopWoodWindow, '+1')
  await sleep(400)
  await bot.clickItemDesc(shopWoodWindow, 'CONFIRM')

  bot.chatAddPattern(/You successfully bought/, 'shopped')

  _waitFor(bot, 'shopped')
  console.log('Chopped some wood, will try to craft')

  bot.closeWindow(shopWoodWindow)

  await _waitForItem(bot, 'log', 2)
  await bot.craftItem('planks', 2)

  await _waitForItem(bot, 'planks', 8)
  await bot.craftItem('stick', 1)

  await _waitForItem(bot, 'stick', 1)
  await bot.craftItem('sign', 1)

  await _waitForItem(bot, 'sign', 1)
  await _placeSign(bot)
}

async function viewMobCoins (bot) {
  await sleep(1000)
  await getCommandAccess(bot)
  await sleep(500)

  bot.chatAddPattern(/Your Mob Coins:(.*)/, 'mobcoinsCount')

  console.log('Sending /mobcoins viewcoins ' + bot.username)
  bot.chat('/mobcoins viewcoins ' + bot.username)

  const msg = (await _waitFor(bot, 'mobcoinsCount'))[0]
  bot.mobCoin.count = _parseMobCoinAmmount(msg)
  console.log('Coins: ' + bot.mobCoin.count)
}

async function dropMobCoins (masterBot, slaveBot) {
  await activateSign(slaveBot)
  await viewMobCoins(slaveBot)

  if (slaveBot.mobCoin.count <= 0) {
    console.log('No coins, giving up early!')
    return
  }

  await _setupAndTp(masterBot, slaveBot)

  await sleep(500)

  while (slaveBot.mobCoin.count > 0) {
    const d = Math.min(slaveBot.mobCoin.count, 2000)
    slaveBot.mobCoin.count -= d
    slaveBot.chat('/mobcoins withdraw ' + d)
    await sleep(2000)
    await tossInventory(slaveBot,
      { filter: (item) => item.displayName.indexOf('unflower') !== -1 })
  }

  await goHome(slaveBot)
}

async function dropInventory (masterBot, slaveBot) {
  if (slaveBot.inventory.slots.filter(it => it).length === 0) {
    console.log('Found no items to drop in inventory')
    return
  }

  await getCommandAccess(slaveBot)
  await _setupAndTp(masterBot, slaveBot)
  await sleep(800)

  const emptyStacks = masterBot.inventory.slots.filter(it => !it).length - 9
  await tossInventory(slaveBot, { maxStacks: emptyStacks })
  await goHome(slaveBot)
}

function setTokenInterval (token, fn, time) {
  const intervalId = setInterval(() => {
    if (token.completed) {
      clearInterval(intervalId)
      return
    }
    fn()
  }, time || 0)
  return intervalId
}

async function selectServer (bot, serverBlock) {
  await _waitForSpawn(bot)
  console.log('Spawned')
  await sleep(500)
  await _selectCompass(bot)
  console.log('Selected compass')

  const moveToken = createToken(0)
  _moveRandom(bot, moveToken)

  setTokenInterval(moveToken, () => {
    bot.activateItem()
  }, 200)

  let window

  try {
    window = await _waitForWindow(bot, 'Select a Server')
  } catch (err) {
    moveToken.complete()
    throw err
  }

  console.log('Activated compass')
  moveToken.complete()

  await sleep(500)
  await bot.clickItemDesc(window, serverBlock)

  const clickToken = createToken(0)
  setTokenInterval(clickToken, async () => {
    try {
      await bot.clickItemDesc(window, serverBlock)
    } catch (err) {
      console.error('Suppressing error', err.message)
    }
  }, 2000)

  try {
    await _waitForSpawn(bot)
  } catch (err) {
    clickToken.complete()
    throw err
  }

  clickToken.complete()

  console.log('Logged in to', serverBlock)
}

async function _setupAndTp (masterBot, slaveBot) {
  slaveBot.chatAddPattern(/coopaccept/, 'coopAccept')
  slaveBot.on('coopAccept', () => {
    slaveBot.chat('/is coopaccept')
    console.log('Sending /is coopaccept')
  })

  let d = 0
  do {
    await _tpAndMove(masterBot, slaveBot)
    d = slaveBot.entity.position.distanceTo(masterBot.entity.position)
    console.log('Distance between bots: ' + d)
    await sleep(600)
  }
  while (d > 3.6 || d < 1.5)
}

async function _tpAndMove (masterBot, slaveBot) {
  slaveBot.chat('/tpa ' + masterBot.username)
  console.log('Sending tpa')

  await _waitFor(slaveBot, 'forcedMove')
  console.log('WE TELEPORTED!!')

  masterBot.chat('/is coop ' + slaveBot.username)

  slaveBot.setControlState('left', true)
  slaveBot.setControlState('forward', true)

  await sleep(1000)

  slaveBot.clearControlStates()
  slaveBot.lookAt(masterBot.entity.position.offset(0, masterBot.entity.height / 2, 0))
}

async function tossInventory (bot, options) {
  options = options || {}
  const filter = options.filter || ((item) => true)
  let maxStacks = options.maxStacks || 1000

  console.log('Dropping inventory!')
  const stacks = bot.inventory.slots
    .filter(item =>
      item && item.name && filter(item))

  console.log('Stacks to drop ' + stacks.length)

  await sleep(1000)
  for (const stack of stacks) {
    bot.tossStack(stack, (err) => {
      if (err) console.log('Could not throw stack')
    })
    await sleep(700)

    bot.tossStack(stack, (err) => {
      if (err) console.log('Could not throw stack a second time')
    })
    await sleep(500)

    maxStacks--
    if (maxStacks <= 0) break
  }

  const stacksLeft = bot.inventory.slots
    .filter(item =>
      item && item.name && filter(item))

  if (stacksLeft.length > 0) {
    console.log('Some stacks could not be dropped!',
      stacksLeft.map(it => it.name))
  }
}

async function _selectCompass (bot) {
  await _waitForItem(bot, 'compass')

  const item = bot.inventory.slots
    .filter((it, index) => it && it.name === 'compass')[0]

  const items = bot.inventory.slots
    .filter((it, index) => it)
    .map(it => it.name)

  if (!item) {
    console.log(items)
    throw new Error('Could not find the compass')
  }

  bot.setQuickBarSlot(1)
  await sleep(50)
  bot.setQuickBarSlot(2)
  await sleep(200)
  bot.setQuickBarSlot(item.slot - 36)
}

async function _moveRandom (bot, token) {
  const baseTime = 300; const jitter = 600
  const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump' ]

  const ctl = ctrls[Math.floor(Math.random() * ctrls.length)]

  while (!token.completed) {
    bot.setControlState(ctl, true)
    await sleep(baseTime + Math.random() * jitter)

    await sleep(Math.random() * jitter)
    if (token.completed) break

    if (Math.random() > 0.4) {
      bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2)
      await sleep(baseTime * 2 + Math.random() * jitter)
      if (token.completed) break
    }

    bot.setControlState(ctl, false)
    await sleep(Math.random() * jitter)
  }

  bot.clearControlStates()
  console.log('Done moving around')
}

function _parseMobCoinAmmount (msg) {
  const coins = msg.trim().split(' ')[0]
  return parseInt(coins.replace(',', '').replace('.', ''))
}

function _parseMobCoinCount (msg) {
  try {
    return parseInt(msg.trim())
  } catch (err) {
    console.log('Could not parse mob coin count from text', msg)
    return 0
  }
}

function _parseMobCoinTime (msg) {
  const parts = msg.trim().split(' ')

  try {
    const minText = parts[0].substring(0, parts[0].length - 1)
    const secText = parts[1].substring(0, parts[1].length - 1)

    const min = parseInt(minText)
    const sec = parseInt(secText)

    const d = new Date()
    d.setMinutes(d.getMinutes() + min)
    d.setSeconds(d.getSeconds() + sec)

    return d
  } catch (err) {
    console.log('Could not parse mobcoin time from msg ' + msg)
    return null
  }
}

async function _placeSign (bot) {
  // We have a sign in inventory and are on our is.
  let item = null

  for (let i = 1; i < 10; i++) {
    item = bot.inventory.slots
      .filter(it => it && it.name === 'sign')[0]

    if (item) break
    await sleep(200)
  }

  if (!item) {
    throw new Error('Could not find the sign')
  }

  bot.setQuickBarSlot(item.slot - 36)

  // The sign is in our hand, hopefully
  await sleep(1000)
  bot.placeBlock(bot.blockAt(bot.entity.position.offset(0, -1, 0)),
    vec3(0, 1, 0), () => {
      console.log('Block placed')
    })

  await sleep(2000)
  console.log('Placed a sign')

  const signBlock = _getMobcoinSign(bot)

  bot.updateSign(signBlock, '[mobcoin]\n\n\n')
}

function _waitForSpawn (bot) {
  return new Promise((resolve, reject) => {
    const onSpawn = () => {
      bot.off('error', onError)
      resolve()
    }

    const onError = (err) => {
      bot.off('spawn', onSpawn)
      reject(err)
    }

    setTimeout(() => {
      bot.off('spawn', onSpawn)
      bot.off('error', onError)
      reject(new Error('Spawn took too long'))
    }, 20 * 1000)

    bot.on('spawn', onSpawn)
    bot.on('error', onError)
  })
}

async function _waitForWindow (bot, title, token = createToken(10 * 1000)) {
  const condition = (window) => window.title.indexOf(title) !== -1
  const arr = await _waitFor(bot, 'windowOpen', { condition, token })
  return arr[0]
}

function _waitFor (bot, event, { condition = () => true, token = createToken(20 * 1000) } = {}) {
  return new Promise((resolve, reject) => {
    if (token.completed) {
      resolve()
      return
    }

    const fun = (...args) => {
      if (condition(...args)) {
        bot.off(event, fun)
        resolve(args)
      }
    }

    const oldComplete = token.complete
    token.complete = function () {
      oldComplete()
      reject(new Error('Token completed before waitFor ' + event))
    }

    bot.on(event, fun)
  })
}

async function _waitForItem (bot, name, amount = 1) {
  for (let i = 1; i < 15; i++) {
    const c = bot.inventory.items()
      .filter(it => it.name === name).map(it => it.count)

    if (c.length > 0 &&
      c.reduce((a, b) => a + b) >= amount) {
      return
    }

    await sleep(200)
  }
}

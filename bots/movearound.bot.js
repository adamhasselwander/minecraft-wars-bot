const helper = require('./helper.js')

module.exports.moveAroundClickUntilWindow = moveAroundClickUntilWindow
module.exports.moveAroundUntilCommandAccess = moveAroundUntilCommandAccess

module.exports.goHome = goHome

async function goHome (bot) {
  await moveAroundUntilCommandAccess(bot)

  return new Promise((resolve, reject) => {
    console.log('Trying to teleport home')

    setTimeout(() => {
      reject(new Error('Timeout: getting the sign'))
    }, 60 * 1000)

    bot.chatAddPattern(/Teleporting you to your island/, 'home')
    bot.chatAddPattern(/You do not have an island/, 'missingHome')
    bot.once('home', onHome)
    bot.once('missingHome', onMissingHome)

    bot.chat('/is home')

    async function onHome () {
      console.log('Telported home')
      bot.off('missingHome', onMissingHome)
      resolve()
    }

    async function onMissingHome () {
      console.log('Missing a home to teleport to')
      bot.off('home', onHome)

      bot.chat('/is')
      bot.once('windowOpen', async (window) => {
        console.log('is window opened')
        await sleep(600)

        bot.once('forcedMove', () => {
          console.log('Teleported home!')
          resolve()
        })

        try {
          await helper.clickItemDesc(bot, window, 'Farmland')
        } catch (err) {
          reject(err)
        }
      })
    }
  })
}
async function moveAroundClickUntilWindow (bot) {
  console.log('Moving around')
  let moveIntervalId = 0

  return new Promise((resolve, reject) => {
    bot.once('windowOpen', onWindowOpen)

    setTimeout(() => {
      bot.clearControlStates()
      bot.off('windowOpen', onWindowOpen)

      if (moveIntervalId) clearTimeout(moveIntervalId)
      moveIntervalId = 0

      reject(new Error('Timeout: Moving around until cmd access'))
    }, 60 * 1000)

    async function onWindowOpen () {
      bot.clearControlStates()

      if (moveIntervalId) clearTimeout(moveIntervalId)
      moveIntervalId = 0

      resolve()
    }

    setTimeout(async () => {
      const baseTime = 300; const jitter = 600
      const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump' ]

      moveIntervalId = setTimeout(moveOnce)

      async function moveOnce () {
        let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]

        bot.setControlState(ctl, true)
        await sleep(baseTime + Math.random() * jitter)

        await sleep(Math.random() * jitter)
        if (!moveIntervalId) return

        if (Math.random() > 0.4) {
          bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2)
          await sleep(baseTime * 2 + Math.random() * jitter)
          if (!moveIntervalId) return
        }

        bot.setControlState(ctl, false)
        await sleep(Math.random() * jitter)

        if (moveIntervalId) moveIntervalId = setTimeout(moveOnce)
      }
    })
  })
}

async function moveAroundUntilCommandAccess (bot) {
  if (bot.cmdAccess) {
    console.log('No need to move around, aldready has access')
    return
  }

  console.log('Moving around')

  return new Promise((resolve, reject) => {
    bot.chatAddPattern(/Island Help/, 'help')
    bot.once('help', onHelp)

    let helpCommandId = 0
    let moveIntervalId = 0

    setTimeout(() => {
      bot.clearControlStates()
      bot.off('help', onHelp)

      if (helpCommandId) clearTimeout(helpCommandId)
      if (moveIntervalId) clearTimeout(moveIntervalId)
      moveIntervalId = 0

      reject(new Error('Timeout: Moving around until cmd access'))
    }, 60 * 1000)

    async function onHelp () {
      bot.clearControlStates()

      if (helpCommandId) clearTimeout(helpCommandId)
      if (moveIntervalId) clearTimeout(moveIntervalId)
      moveIntervalId = 0

      console.log('Now able to send commands')
      bot.cmdAccess = true
      resolve()
    }

    helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)

    async function sendHelpCommand () {
      bot.chat('/help')
      helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)
    }

    setTimeout(async () => {
      const baseTime = 300; const jitter = 600
      const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump' ]

      moveIntervalId = setTimeout(moveOnce)

      async function moveOnce () {
        let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]

        bot.setControlState(ctl, true)
        await sleep(baseTime + Math.random() * jitter)

        await sleep(Math.random() * jitter)
        if (!moveIntervalId) return

        if (Math.random() > 0.4) {
          bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2)
          await sleep(baseTime * 2 + Math.random() * jitter)
          if (!moveIntervalId) return
        }

        bot.setControlState(ctl, false)
        await sleep(Math.random() * jitter)

        if (moveIntervalId) moveIntervalId = setTimeout(moveOnce)
      }
    })
  })
}

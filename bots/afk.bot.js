require('./consolescreens.js')
const mineflayer = require('mineflayer')

const loginBot = require('./login.bot.js')

const helper = require('./helper.js')
const bots = [] // I fear the bots will be garbage collected if i don't do this.
const retryDelay = 5 * 60 * 1000

;
(async function () {
  console.log('Starting the bot')
  console.log()

  const accounts = helper.readAfkAccounts()

  for (let acc of accounts) {
    const username = acc.username
    const password = acc.password

    const bot = mineflayer.createBot({
      host: 'pvpwars.net',
      port: 25565,
      username: username,
      password: password,
      version: '1.8',
      verbose: true
    })

    console.log()
    console.log('--- ' + username + ' ---')

    bot.on('login', () => {
      console.log('Username: ' + bot.username)
    })

    try {
      await loginBot.waitForErrors(bot)
      await loginBot.spawnAndLogin(bot)
      bots.push(bot)
      console.log('Bot ' + bot.username + ' is up and running')
    } catch (error) {
      console.log('Disconnecting from minecraft')
      await helper.disconnectSafely(bot)
    }

    await sleep(1000)
  }
})()

function onEnd () {
  console.log('Bot ' + this.username + ' was disconnected')
  this.removeAllListeners()
  this._client.removeAllListeners()

  setTimeout(async () => {
    await retryLogin(this.email, this.password)
  }, retryDelay)
}

async function retryLogin (email, password) {
  console.log('Bot ' + this.username + ' retrying to login')

  const bot = mineflayer.createBot({
    host: 'pvpwars.net',
    port: 25565,
    username: email,
    password: password,
    version: '1.8',
    verbose: true
  })

  bot.email = email
  bot.password = password

  try {
    await loginBot.waitForErrors(bot)
    await loginBot.spawnAndLogin(bot)
    bots.push(bot)
    bot.on('end', onEnd)
    console.log('Bot ' + bot.username + ' successfully reloged')
  } catch (err) {
    console.log('Disconnecting from minecraft')
    await helper.disconnectSafely(bot)

    setTimeout(async () => {
      await retryLogin(email, password)
    }, retryDelay)
  }
}

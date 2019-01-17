require('./consolescreens.js')
const mineflayer = require('mineflayer')

const pvpwarsPlugin = require('./pvpwars.plugin.js')

const server = require('./settings.js').serverBlock
const helper = require('./helper.js')

const bots = [] // I fear the bots will be garbage collected if i don't do this.
const retryDelay = 5 * 60 * 1000

;(async function () {
  console.log('Starting the bot')
  console.log()

  const accounts = helper.readAfkAccounts()

  for (let acc of accounts) {
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

  setTimeout(async () => {
    await retryLogin(this.email, this.password)
  }, retryDelay)
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
  
  try {
    await bot.pvpwars.selectServer(server)
    bot.pvpwars.runAllCommands()
    bots.push(bot)
    bot.on('end', onEnd)
    console.log('Bot ' + bot.username + ' successfully loggedin')
  } catch (err) {
    console.log(err)
    console.log('Disconnecting from minecraft')
    await bot.disconnectSafely()

    setTimeout(async () => {
      await retryLogin(email, password)
    }, retryDelay)
  }
}

const console = require('./consolescreens.js')
const fs = require('fs')

const mineflayer = require('mineflayer')

const table = require('./table.js')
const colors = require('./colors.js')

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const movearoundBot = require('./movearound.bot.js')
const username = require('./settings').spectator.username
const password = require('./settings').spectator.password
let sortKey = 'mobcoins'
let watchDogReset = false

setTimeout(() => {

   if (watchDogReset) {
      process.stdout.write('Timeout triggered')
      process.exit()
   }
   watchDogReset = true

}, 3 * 60 * 1000)

;
(async function() {
   const usernames = helper.readUsernames();
   let coins = helper.readAccountCoins();
   
   printTable(usernames, coins)

   const spectator = mineflayer.createBot({
     host: "pvpwars.net",
     port: 25565,
     username: username,
     password: password,
     version: '1.8',
     verbose: true
   })
   
   spectator.once('kicked', (reason) => {
      process.stdout.write('kicked ' + reason)
   })

   loginBot.spawnAndLogin(spectator)
   await sleep(5000)
   await movearoundBot.moveAroundUntilCommandAccess(spectator)
   await sleep(5000)
   
   await logShop(spectator)

   setInterval(async () => {
      await logShop(spectator)
   }, 1000 * 60 * 60 * 2)

   console.log("Waiting for players to join")
   spectator.on('playerJoined', onPlayerJoined)
   
   async function onPlayerJoined(player) {
      spectator.chat('/mobcoins viewcoins ' + player.username)
   }

   spectator.once('end', () => {
      console.log('Connection ended')
      process.stdout.write('Connecton ended')
      process.exit()
   })
   
   spectator.on('windowOpen', (window) => {
      if (window.title.toLowerCase().indexOf('coins') != -1)
         return

      let items = window.slots.filter((item, index) => {
         if (!item) return false

         item.slot = index

         if (item.name == 'stained_glass_pane' || item.slot >= 36)
            return false

         item.desc = item.nbt.value.display.value.Name.value
            .replace(/§[0-9a-flnmokr]/g, '')

         console.log(item.slot + ' ' + item.name +' ' + item.desc)

         return true
      })
      console.log(window.title, items.map(it => it.desc || it.displayName))
      process.stdout.write('Window opened')
      process.stdout.write(window.title, items.map(it => it.desc || it.displayName))
      process.exit()
   })

   spectator.chatAddPattern(/(.*)s Mob Coins:(.*)/, "playerMobcoinCount")
   spectator.on("playerMobcoinCount", async (user, userCoins) => {
      const username = user.trim().slice(0, -1)
      const coin = parseInt(userCoins.trim().replace(',', ''))
      
      coins[username] = coins[username] || {}
      if (coins[username].mobcoins < coin) 
         coins[username].lastCoinIncrease = (new Date()).getTime()
      
      coins[username].mobcoins = coin
      coins[username].lastUpdated = (new Date()).getTime()
      
      console.log(helper.randColor('XXXX') + '\033[1A')

      helper.writeAccountCoins(coins)
      watchDogReset = false
   }) 
   
   setInterval(() => {
      printTable(usernames, coins)
   }, 15 * 1000)
      
   
   setInterval(async () => {
      try {
         await moveRandom(spectator)
      } catch (err) {}
   }, 60 * 1000)
      
})();

async function moveRandom(spectator) {

   const baseTime = 200, jitter = 300;
   const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump']

   let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]
         
   spectator.setControlState(ctl, true)
   await sleep(baseTime + Math.random() * jitter)
         
   if (Math.random() > 0.4) {

      spectator.look(
         Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);

      await sleep(baseTime * 2 + Math.random() * jitter)
   }
   
   spectator.setControlState(ctl, false)

}

function printTable(usernames, coins) {
   let arr = []

   for (let username of usernames) {
      if (!coins[username] || !coins[username].lastUpdated) continue

      const now = (new Date()).getTime()
      const lastUpdatedMins = Math.floor((now - coins[username].lastUpdated) /
            (1000 * 60)) 

      const lastInc = Math.floor(
         (now - (coins[username].lastCoinIncrease || 0)) / (1000 * 60)) 

      if (lastUpdatedMins > 60) continue

      arr.push({
         username: username.padEnd(20),
         mobcoins: coins[username].mobcoins,
         mins: lastUpdatedMins,
         lastInc: lastInc > 100000 ? '---' : lastInc
      })

   }
   
   arr.sort((a,b) => a.mins - b.mins)
   logTables('tm', arr)
   arr.sort((a,b) => a.lastInc - b.lastInc)
   logTables('tl', arr)
   arr.sort((a,b) => a.mobcoins - b.mobcoins)
   logTables('tc', arr)
}

function logTables(screen, obj) {
   let arr = obj.filter(() => true)
   const tot = arr.length == 0 ? 0 :
      arr.map(a => a.mobcoins)
         .reduce((a, b) => a + b)

   arr.push({})
   arr.push({username: 'Average', mobcoins: Math.floor(tot / (arr.length - 1))})
   arr.push({username: 'Total', mobcoins: tot})

   arr = arr.map(a => ({
      username: colors.Fg.Green + (a.username || '') + colors.Fg.White,
      mobcoins: colors.Fg.Yellow + (a.mobcoins || '') + colors.Fg.White,
      mins: a.mins,
      'last inc': a.lastInc > 100000 ? '---' : a.lastInc
   }))

   console.logScreen(screen, table(arr, ''))
   console.log(helper.randColor('XXXX') + '\033[1A')
}

async function logShop(spectator) {

   const items = await helper.parseMobcoinShop(spectator)
   const tbl = {}
   for (const item of items) {
      tbl[item.slot] = { 
         text: helper.color(item.desc, colors.Fg.Magenta), 
         price: helper.color(item.price, colors.Fg.Yellow), 
         item: item.name
      }
   }
   
   console.logScreen('shop' ,table(tbl, '#'))

}



const fs = require('fs')

const mineflayer = require('mineflayer')

const table = require('./table.js')
const colors = require('./colors.js')

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const movearoundBot = require('./movearound.bot.js')
const username = require('./settings').spectator.username
const password = require('./settings').spectator.password
let watchDogReset = false

setTimeout(() => {

   if (watchDogReset) process.exit()
   watchDogReset = true

}, 3 * 60 * 1000)

;
(async function() {
   console.log("Starting spectator")
   console.log()
   const usernames = helper.readUsernames();
   let coins = helper.readAccountCoins();
   await sleep(6000) 
   printTable(usernames, coins)
   const spectator = mineflayer.createBot({
     host: "pvpwars.net",
     port: 25565,
     username: username,
     password: password,
     version: '1.8',
     verbose: true
   })
   
   loginBot.spawnAndLogin(spectator)
   await sleep(5000)
   await movearoundBot.moveAroundUntilCommandAccess(spectator)
   await sleep(5000)
   
   console.log("Waiting for players to join")
   spectator.on('playerJoined', onPlayerJoined)
   
   async function onPlayerJoined(player) {
      spectator.chat('/mobcoins viewcoins ' + player.username)
   }

   spectator.once('end', () => {
      process.exit()
   })
   
   spectator.on('windowOpen', (window) => {
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
   console.log()
   console.log()
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
   
   arr.sort((a,b) => a.mobcoins - b.mobcoins)

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
      'last inc': a.lastInc
   }))

   console.log('\033['+(Object.keys(arr).length + 5) +'A')
   console.log(table(arr, ''))
   console.log(helper.randColor('XXXX') + '\033[1A')
}

const fs = require('fs')
const mineflayer = require('mineflayer')

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const movearoundBot = require('./movearound.bot.js')
const username = require('./settings').spectator.username
const password = require('./settings').spectator.password
;

(async function() {
	console.log("Starting spectator")
	console.log()
	const usernames = helper.readUsernames();
	let coins = helper.readAccountCoins();
	
	setTimeout(() => {
		process.exit()
	}, 45 * 60 * 1000 + Math.random() * 1000 * 60 * 15)
	
	const spectator = mineflayer.createBot({
	  host: "pvpwars.net",
	  port: 25565,
	  username: username,
	  password: password,
	  version: '1.8',
	  verbose: true
	})
	
   loginBot.spawnAndLogin(spectator)
   await sleep(1000)
   await movearoundBot.moveAroundUntilCommandAccess(spectator)
   await sleep(500)
   
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
      let username = user.trim()
      username = username.slice(0, username.length - 1);
      let coin = userCoins.trim().replace(',', '')
      
      coins[username] = coins[username] || {}
      coins[username].mobcoins = parseInt(coin)
      coins[username].lastUpdated = (new Date()).getTime()
      
      process.stdout.write('.')

      helper.writeAccountCoins(coins)
   }) 
  	
	setInterval(() => {
		let old = 0

		console.log()
		console.log()
		let arr = []

		for (let username of usernames) {
			let d = (!coins[username] || !coins[username].lastUpdated) ? '?' :
            (Math.floor(((new Date()).getTime() - coins[username].lastUpdated) /
               (1000 * 60))) 

         if (parseInt(d) > 60) {
            old++
            continue
         }

         d += 'min'
         
         arr.push({username:username.padEnd(20), mobcoins: coins[username].mobcoins, mins: d })
		}
		
      arr.sort((a,b) => a.mobcoins - b.mobcoins)

      const tot = arr.map(a => a.mobcoins).reduce((a, b) => a + b)

      arr.push({})
      arr.push({username: 'Average', mobcoins: Math.floor(tot / (arr.length - 1))})
      arr.push({username: 'Total', mobcoins: tot})

      console.table(arr)

	}, 15 * 1000)
		
	setInterval(() => {

		for (let username of usernames) {
			
			if (spectator.players[username]) {
				spectator.chat('/mobcoins viewcoins ' + username)
				console.log(username + ' is online, sending command to view coins')
			}
		}
		
	}, 60 * 1000)
		
	
	setInterval(async () => {
		
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
		
	}, 60 * 1000)
		
})();


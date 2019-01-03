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
	const usernames = readUsernames();
	let coins = readAccountCoins();
	
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
      setTimeout(() => {
         spectator.chat('/mobcoins viewcoins ' + player.username)
      }, 500 + Math.floor(Math.random() * 1000))
	}

   bot.chatAddPattern(/(.*)s Mob Coins:(.*)/, "playerMobcoinCount")
   bot.on("playerMobcoinCount", async (user, coins) => {
      let parts = msg.('s Mob Coins: ')
      let username = user.trim()
      username = username.slice(0, username.length - 1);
      let coin = coins.trim().replace(',', '')
      
      coins[username] = coins[username] || {}
      coins[username].mobcoins = parseInt(coin)
      coins[username].lastUpdated = (new Date()).getTime()
      
      writeAccountCoins(coins)
   }) 
  	
	setInterval(() => {
		let tot = 0
		
		console.log()
		console.log()
		
		for (let username of usernames) {
			let d = (!coins[username] || !coins[username].lastUpdated) ? '?' :
            (Math.floor(((new Date()).getTime() - coins[username].lastUpdated) /
               (1000 * 60)) + 'min') 
			
			console.log(username.padEnd(20) + 
            (!coins[username] ? '?' :
               coins[username].mobcoins + '').padEnd(10) + d.padEnd(6))

			tot += (!coins[username] ? 0 : parseInt(coins[username].mobcoins))
		}
		
		console.log("Total:".padEnd(20) + (tot + '').padEnd(10))

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


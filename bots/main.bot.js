const fs = require('fs');
const mineflayer = require('mineflayer')

const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js')
const movearoundBot = require('./movearound.bot.js')

const helper = require('./helper.js')
const readFileInterval = 30 * 1000
let totalMobCoinsCollected = 0
;

(async function() {
	console.log("Starting the bot")
	console.log()

   helper.readAccounts(true)
	console.log()
   printTimes();
	
	while(true) {
		await collectMobCoinsAllAccounts()
		
      printTimes();
      console.log("Total coins collected: ", totalMobCoinsCollected)
		await sleep(readFileInterval)
	}
	
})();

async function collectMobCoinsAllAccounts() {

   const accounts = helper.readAccounts()
      .map(acc => {
         acc.timeLeft = getTimeToRun(acc.username)
         return acc
      })
      .filter(acc => acc.timeLeft < 0)
      .sort((a, b) => b.timeLeft - a.timeLeft)
      .map((acc, index) => {
         acc.index = index
         return acc
      })

	for (let acc of accounts) {
		const username = acc.username;
		const password = acc.password;
		
      const bot = mineflayer.createBot({
        host: "pvpwars.net",
        port: 25565,
        username: username,
        password: password,
        version: '1.8',
        verbose: true
      })
      bot.mobCoin = {}

      console.log()
      console.log('--- ' + username + ' ---')

      bot.on('login', onLogin)
      function onLogin() {
         bot.removeListener('login', onLogin)
         console.log('Username: ' + bot.username)
      }
      
      try {
         
         await loginBot.waitForErrors(bot)
         await loginBot.spawnAndLogin(bot)
         await activatesignBot.activateSign(bot)
         resetFails(username)

      } catch (error) {
         
         fs.appendFileSync('errors.txt', 
            bot.username + ' (' + username + '):' +
            new Date().toISOString().replace('T', ' ').substr(0, 19) + ' :' + 
            error.message + '\n\n' + error.stack + '\n\n');

         console.log('Error: ', error.message)
         increaseFails(username)
         
      } finally {
         
         updateUsername(username, bot.username)
         updateTimeToRun(username, bot.mobCoin.nextSignTime)
         totalMobCoinsCollected += (bot.mobCoin.collected || 0)

         console.log("Disconnecting from minecraft")
         await helper.disconnectSafely(bot)
      
      }
      
      console.log('--- /' + username + ' ---')
      console.log()
      console.log((acc.index + 1) + ' of ' + accounts.length)
      await sleep(5000)
	}
}



function updateUsername(email, username) {
   if (!email || !username) return

	const times = helper.readAccountTimes() || {}
   const usernames = helper.readAccountUsernames() // One could cache this
	usernames[email] = usernames[email] || {};

	usernames[email].username = username
	helper.writeAccountUsernames(usernames);

}

function updateTimeToRun(username, time) {
	
   time = time || ((new Date()).getTime() + 5 * 60 * 1000)
   const times = helper.readAccountTimes() || {}
	
   times[username] = times[username] || {};
   times[username].timetorun = time + 
      Math.floor(Math.random() * 5 * 60 * 1000) * 
      Math.floor(Math.pow(2, times[username].failsInARow || 0) * Math.random())
   
   helper.writeAccountTimes(times);

}

function resetFails(username) {
	
   const times = helper.readAccountTimes() || {}
	
   times[username] = times[username] || {}
   times[username].failsInARow = 0
   
   helper.writeAccountTimes(times);

}

function increaseFails(username) {
	
   const times = helper.readAccountTimes() || {}
	
   times[username] = times[username] || {}
   times[username].failsInARow = times[username].failsInARow || 0
   times[username].failsInARow++
   
   helper.writeAccountTimes(times);

}

function printTimes() {
	
   console.log()
   let accounts = helper.readAccounts().map(acc => {
      acc.timeLeft = getTimeToRun(acc.username)
      return acc
   }).sort((a, b) => b.timeLeft - a.timeLeft)
   
	for (let acc of accounts) {
		const username = acc.username;
		const password = acc.password;
		
		let msLeft = getTimeToRun(username)
      console.log(username.padEnd(45), 
         (Math.floor(msLeft / (60 * 1000)) + "min").padEnd(10));
	}
}

function getTimeToRun(username) {
	
   const times = helper.readAccountTimes() // One could cache this
   
   return !times[username] ? 0 : 
      (times[username].timetorun - (new Date()).getTime())

}


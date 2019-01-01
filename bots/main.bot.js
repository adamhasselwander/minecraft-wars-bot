const fs = require('fs');
const mineflayer = require('mineflayer')

const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js')
const movearoundBot = require('./movearound.bot.js')

const helper = require('./helper.js')
const readFileInterval = 60 * 1000
;

(async function() {
	console.log("Starting the bot")
	console.log()

   helper.readAccounts(true)
	console.log()

	while(true) {
		await collectMobCoinsAllAccounts()
		
      printTimes();
		await sleep(readFileInterval)
	}
	
})();

async function collectMobCoinsAllAccounts() {
	
	for (let acc of helper.readAccounts()) {
		
		const username = acc.username;
		const password = acc.password;
		
		if (getTimeToRun(username) > 0) continue

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
         
         await waitForErrors(bot)
         await loginBot.spawnAndLogin(bot)
         await activatesignBot.activateSign(bot)

      } catch (error) {
         
         fs.appendFileSync('errors.txt', 
            bot.username + ' (' + username + '): ' + 
            error.message + '\n\n' + error.stack + '\n\n');

         console.log('Error: ', error.message)
         
      } finally {
         
         updateUsername(username, bot.username)
         updateTimeToRun(username, bot.mobCoin.nextSignTime)
         
         console.log("Disconnecting from minecraft")
         await helper.disconnectSafely(bot)
      
      }
      
      console.log('--- /' + username + ' ---')
      console.log()

	}
}

async function waitForErrors(bot, maxSecondsToWait = 10) {
 	
   return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
	      resolve()
      }, maxSecondsToWait * 1000)
	    
      bot.on('login', onLogin)
      function onLogin() {
         bot.removeListener('login', onLogin)
         resolve()
      }
      
      bot.on('error', onError)

      function onError(err) {
         console.log('There was an unkown error during login')
         reject(new Error(err))
      }

   })

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
   times[username].timetorun = time + Math.floor(Math.random() * 5 * 60 * 1000)
   
   helper.writeAccountTimes(times);

}

function printTimes() {
	
   console.log()

	for (let acc of helper.readAccounts()) {
		const username = acc.username;
		const password = acc.password;
		
		let msLeft = getTimeToRun(username)
      console.log(username.padEnd(30), 
         (Math.floor(msLeft / (60 * 1000)) + "min").padEnd(10));
	}
}

function getTimeToRun(username) {
	
   const times = helper.readAccountTimes() // One could cache this
   
   return !times[username] ? 0 : 
      (times[username].timetorun - (new Date()).getTime())

}


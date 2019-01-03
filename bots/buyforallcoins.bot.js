let readline = require('readline');
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const mineflayer = require('mineflayer')
const fs = require('fs');
const Vec3 = require('vec3').Vec3

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const dropmobcoinsBot = require('./dropmobcoins.bot.js');
const movearoundBot = require('./movearound.bot.js');

(async function() {
	let item = await getItemToBuy()
	console.log(item)
	
	await buyItemOnAllAccounts(item)
})();

async function buyItemOnAllAccounts(item) {
	
	let accounts = helper.readAccounts();
	
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
		
      try {
         await loginBot.spawnAndLogin(bot)
         await movearoundBot.moveAroundUntilCommandAccess(bot)
         await sleep(1000)
         await buyItem(bot, item)
      } catch (err) {
         console.log(err)
      } finally {
         await helper.disconnectSafely(bot)
      }

	}
}

async function getItemToBuy() {
	console.log("Lets buy stuff for mobcoins!");
	console.log()
	let accounts = helper.readAccounts();
	
	let master = accounts.filter(a => a.isMaster);
	if (!master) {
		return "There is no master defined! Add a semicolon (username:password:) to set the master"
	}
	
	master = master[0]
	
	const masterBot = mineflayer.createBot({
	  host: "pvpwars.net",
	  port: 25565,
	  username: master.username,
	  password: master.password,
	  version: '1.8',
	  verbose: true
	})
	
	await helper.spawnAndLogin(masterBot)
	
	return new Promise((resolve, reject) => {
					
		console.log('Executing /mobcoins')
		masterBot.chat('/mobcoins')
		
		masterBot.on('windowOpen', onWindowOpen)
		
		async function onWindowOpen(window) {
			masterBot.removeListener('windowOpen', onWindowOpen)
			
			console.log('Mobcoin shop opened with title: ' + window.title)
			
			await sleep(2000)
			
			let items = window.slots.filter((item, index) => {
            item.slot = index

          	if (!item || item.name == 'stained_glass_pane' || item.slot >= 36)
               return false

            let desc = win.slots
               .filter(s => s && s.type != -1 && s.type != 160)
               .map(s => s.nbt)[0].value.display.value.Name.value
               .replace(/§[0-9a-flnmokr]/g, '')

				item.desc = desc
				console.log(item.slot + ' ' + item.name +' ' + item.desc)

            return true
         })
			
			console.log("Please enter a number"))
			
			masterBot.closeWindow(window)
			
         rl.on('line', onLine)
			await helper.disconnectSafely(masterBot)
			
			async function onLine(line) {
				try {
					let choice = parseInt(line);
					console.log('Selected item: ' + items[choice].displayName)
					rl.off('line', onLine)						
					
					resolve(items[choice])
				} catch {
					console.log("Could not parse the choice " + line)
					console.log("Please enter a new number")
				}
			}
		}
		
	})
	
}

async function buyItem(bot, item) {
		
	return new Promise((resolve, reject) => {
      
      bot.chat('/mobcoins')						
      bot.on('windowOpen', onWindowOpen)
         
      async function onWindowOpen(window) {
         bot.off('windowOpen', onWindowOpen)
         
         await sleep(2000)

         bot.chatAddPattern(/You have purchased/, "mobcoinShopped")
         bot.chatAddPattern(/Mob Coins to purchase this./, "mobcoinNotEnough")
         bot.once("mobcoinShopped", onMobcoinShopped)
         bot.once("mobcoinNotEnough", onMobcoinNotEnough) 

         bot.clickWindow(item.slot, 0, 0, (err) => {
            if (err) console.error(err);
         })
         
         console.log("Trying to buy item: " + item.desc + ' in window ' +
            window.title);

         async function onMobcoinShopped() {
            bot.off("mobcoinNotEnough", onMobcoinNotEnough)

            console.log('Souccessfully bought your item, buying another one!')
            await buyItems(bot, item)
         }

         async function onMobcoinNotEnough() {
            bot.off("mobcoinShopped", onMobcoinShopped)

            console.log('Not enough mob coins to buy more items!')
            resolve()
         }

      }
   })
}


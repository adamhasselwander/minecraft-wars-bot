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
		
		await loginBot.spawnAndLogin(bot)
		await movearoundBot.moveAroundUntilCommandAccess(bot)
		await sleep(1000)
		await buyItem(bot, item)
		
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
	
	await spawnAndLogin(masterBot)
	
	return new Promise((resolve, reject) => {
					
		console.log('Executing /mobcoins')
		masterBot.chat('/mobcoins')
		
		masterBot.on('windowOpen', onWindowOpen)
		
		async function onWindowOpen(window) {
			masterBot.removeListener('windowOpen', onWindowOpen)
			
			console.log('Mobcoin shop opened with title: ' + window.title)
			
			await sleep(2000)
			
			let i = 0
			let arr = []
			let items = window.slots
			for (let item of items) {
				if (!item || item.name == 'stained_glass_pane' || item.slot >= 36) continue
				
				arr[i] = item;
				console.log(i + ' ' + item.name +' ' + item.displayName)
				i++;
			}
			
			console.log("Please enter a number between 0 and " + (i - 1))
			
			masterBot.closeWindow(window)
			
			masterBot.quit()
			await sleep(3000)
			masterBot.end()
			
			rl.on('line', onLine)
			async function onLine(line) {
				try {
					let choice = parseInt(line);
					console.log('Selected item: ' + arr[choice].displayName)
					rl.removeListener('line', onLine)						
					
					resolve(arr[choice])
				} catch {
					console.log("Could not parse the choice " + line)
					console.log("Please enter a new number")
				}
			}
		}
		
	})
	
}


async function buyItem(bot, item) {
		
	bot.chat('/mobcoins')						
	bot.on('windowOpen', onWindowOpen)
		
	async function onWindowOpen(window) {
		bot.removeListener('windowOpen', onWindowOpen)
		
		await sleep(2000)
		
		const itemType = item.type
		const metadata = item.metadata
		
		const sourceStart = 0
		const sourceEnd = window.inventorySlotStart
		const destStart = window.inventorySlotStart
		const destEnd = window.inventorySlotStart + 8
		
		bot.clickWindow(item.slot, 0, 0, (err) => {
			if (err) console.error(err);
			
			bot.clickWindow(item.slot, 1, 0, (err) => {
				if (err) console.error(err);
			})
		})
		
		console.log("Trying to buy item: " + item.displayName + ' in window ' + window.title);
				
		bot.on('message', onMessage)
		
		async function onMessage(jsonMessage) {
			bot.removeListener('message', onMessage)
			
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
			
			if (msg.indexOf("You have purchased") != -1) {
				
				console.log('Souccessfully bought your item, buying another one!')
				await buyItems(bot, item)
				
			} else if (msg.indexOf("Mob Coins to purchase this.") != -1) {
				
				console.log('Not enough mob coins to buy more items!')
				return
			}
		}
	}
}


const movearoundBot = require('./movearound.bot.js')
const helper = require('./helper.js')
const serverBlock = require('./settings.js').serverBlock
const printServerBlocks = require('./settings.js').printServerBlocks

module.exports.spawnAndLogin = spawnAndLogin
module.exports.login = login

async function spawnAndLogin(bot) {
	return new Promise((resolve, reject) => {
     
      const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Login"))
		}, 20 * 1000)
		
		bot.on('spawn', onSpawn)

		async function onSpawn() {
			bot.removeListener('spawn', onSpawn)
			
			try {
				await login(bot)
			} catch (err) {
				reject(err)
				return
			}
			
			resolve()			
		}
	})
}

async function login(bot ) {
	
	let windowHasOpened = false

	return new Promise((resolve, reject) => {
		
		setTimeout(async () => {
			let err = await openServerSelection()
			if (err){
				console.log(err)
				reject(new Error(err))
			}
		})
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Choosing server after login"))
		}, 60 * 1000)
		
		bot.on('spawn', onSpawn)

		bot.on('windowOpen', onWindowOpen)
		
		async function onSpawn() {
			bot.removeListener('spawn', onSpawn)
			bot.removeListener('windowOpen', onWindowOpen)
			resolve(bot)
		}
		
		async function onWindowOpen(win) {
			windowHasOpened = true

			if (win.title.indexOf('Select a Server') != -1) {
				console.log("Window opened with title " + win.title);
				await selectAServer(win)
			} else {
				console.warn("This window should not have been opened", win.title);
			}
		}
	})
	
	async function selectAServer(win) {
		
      if (printServerBlocks) {
         console.log()
         console.log()
         console.log('Server blocks: ')
		   console.log(win.slots.filter(it => it).map(it => it.name))
         console.log()
         console.log()
      }

		
		let dia = win.slots.filter(it => it && it.name.indexOf(serverBlock) != -1);

		const itemType = dia[0].type
		const metadata = dia[0].metadata
		
		const sourceStart = 0
		const sourceEnd = win.inventorySlotStart
		
		const destStart = win.inventorySlotStart
		const destEnd = win.inventorySlotStart + 8
		
		bot.clickWindow(dia[0].slot, 0, 0, (err) => {
			if (err) console.error(err);
					
			const options = {
				window: win,
				
				itemType,
				metadata,
				count: 1,
				
				sourceStart, sourceEnd, 
				destStart, destEnd
			}
			
			console.log("Starting transfer...");

			bot.transfer(options, async (err) => {
				if (err) console.error(err)
				else console.log("Successfully transfered block")
				
				if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
			})
			
		})
	}

	async function openServerSelection() {
		await movearoundBot.moveAround(bot)
		
		console.log("Checking inventory")
		
		await sleep(300);
		
		return await activateCompass();
	}

	async function activateCompass() {
		windowHasOpened = false
		
		if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
		
		let i = 0;
		while (++i < 5 && bot.inventory.items().lenght < 0) await sleep(200);
		if (i == 5) return "No items in inventory"

		let items = bot.inventory.items();
		let item = bot.inventory.items().filter(it => it.name == 'compass');
		
		if (item.length == 0) {
			return "Could not find the compass"
		}
		
		bot.setQuickBarSlot(3)
		await sleep(200);
		bot.setQuickBarSlot(2)
		await sleep(500);
		bot.setQuickBarSlot(item[0].slot / 10)
		
		await sleep(800);
		
		bot.activateItem();
		await sleep(50);
		
		bot.activateItem();
		await sleep(100);
		
		bot.activateItem();
		
		await sleep(1000);
		
		if (!bot.currentWindow && !windowHasOpened) return "No window opened"
		
		console.log("Activated compass")
	}
	
}



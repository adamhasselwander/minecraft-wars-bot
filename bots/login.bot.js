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
		}, 30 * 1000)
		
		bot.once('spawn', async () => {
			
			try {
				await login(bot)
			} catch (err) {
				reject(err)
				return
			}
			
			resolve()			
		})
	})
}

async function login(bot ) {
	
	let windowHasOpened = false
   let intervalId = 0
   
   console.log("Checking inventory")

	return new Promise((resolve, reject) => {
	
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Choosing server after login"))
		}, 60 * 1000)
		
		bot.once('spawn', async () => {
			bot.off('windowOpen', onWindowOpen)
			resolve(bot)
		})

		bot.on('windowOpen', onWindowOpen)

      setTimeout(async () => {
         try {
            await activateCompass();
            await movearoundBot.moveAroundClickUntilWindow(bot)
         } catch (err) {
            reject(new Error(err))
         }
      })      

		async function onWindowOpen(win) {
			windowHasOpened = true

			if (win.title.indexOf('Select a Server') != -1) {
				console.log("Window opened with title " + win.title);
            clearInterval(intervalId)

            try {
               await helper.clickItemDesc(bot, win, serverBlock)
            } catch(err) {
               reject(new Error(err))
            }

			} else {
				console.warn("This window should not have been opened", win.title);
			}
		}
	})

	async function activateCompass() {
		windowHasOpened = false
		
		if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
		
		let item = bot.inventory.slots.filter((it, index) => {
            if (!it) return false
            it.slot = index 
            return it.name == 'compass'
         })
		
		if (item.length == 0) {
			throw new Error("Could not find the compass")
		}

      item = item[0]
		bot.setQuickBarSlot(1)
      await sleep(50)
		bot.setQuickBarSlot(2)
      await sleep(200)
		bot.setQuickBarSlot(item.slot - 36)
      
      intervalId = setInterval(() => {

		   bot.activateItem();

      }, 200)
		
		console.log("Activated compass")
	}
	
}


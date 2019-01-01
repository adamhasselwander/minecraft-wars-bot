const movearoundBot = require('./movearound.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const mineflayer = require('mineflayer')
const vec3 = require('vec3')
const someoneWithASignShop = require('./settings.js').someoneWithASignShop

module.exports.getSign = getSign

async function getSign(bot) {
	// We have no sign in our world, therefore we need to get one

	await movearoundBot.moveAroundUntilCommandAccess(bot);
	await sleep(500)
	
	return new Promise((resolve, reject) => {
		console.log('Trying to teleport home')
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: getting the sign"))
		}, 60 * 1000)
			
		bot.chat('/is home')
		bot.on('message', onMessage)
		
		async function onMessage(jsonMessage) {
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
			
			if (msg.indexOf('Teleporting you to your island.') != -1) {
				bot.removeListener('message', onMessage)
				
				// We have an island
				await sleep(2000)
				
				const sign = bot.findBlock({
					matching: isMatchingType,
				})
				
				if (sign) {
					await activatesignBot.activateSign(bot)

					resolve()
					return
				}
				
				await getAndPlaceSign(bot)
				
				resolve()
				
				// run the bot from the beginning to see if we have a sign over there
				// That may be dangerous
				
				
			} else if (msg.indexOf('You do not have an island!') != -1) {
				bot.removeListener('message', onMessage)

				
				// We have no island
				bot.chat('/is');
				bot.on('windowOpen', onWindowOpen)
				
				async function onWindowOpen(window) {
					bot.removeListener('windowOpen', onWindowOpen)
					
					await sleep(1000)
					
					let wheat = window.slots.filter(item => item && item.name.indexOf('wheat') != -1)[0]
					// Lets take the wheat!
					
					const itemType = wheat.type
					const metadata = wheat.metadata
					
					const sourceStart = 0
					const sourceEnd = window.inventorySlotStart
					const destStart = window.inventorySlotStart
					const destEnd = window.inventorySlotStart + 8
					
					const options = {
						window,
						itemType,
						metadata,
						count: 1,
						sourceStart, sourceEnd, 
						destStart, destEnd
					}
					
					console.log("Trying to create an island");

					bot.transfer(options, async (err) => {
						if (err) console.error(err)
						else console.log("Creating island!")
						
						if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
					})
				
					bot.on('forcedMove', onForcedMove3)
					
					async function onForcedMove3() {
						bot.removeListener('forcedMove', onForcedMove3)
						
						await getAndPlaceSign(bot)
						resolve()
					}
			
				}
				
			}
			
		}
	})
}


async function getAndPlaceSign(bot) {
	
	// Check if  there is a sign in the inventory before getting one
	let sign = bot.inventory.slots.filter(it => it && it.name == 'sign');
	
	if (sign.length > 0) {
		console.log('Found a sign, trying to place it!')
		await sleep(500)
		bot.setQuickBarSlot(sign[0].slot - 36)
		await sleep(500)
		
		await placeSign(bot)
		return
	}
	
	return new Promise((resolve, reject) => {
		console.log('Found no sign, will get one form ' + someoneWithASignShop)
		
		const watchDogId = setTimeout(async () => {
			reject(new Error("Timeout: Trying to tp to get a sign"))
		}, 60 * 1000)
				
		bot.chat('/is warp ' + someoneWithASignShop)
		bot.on('forcedMove', onForcedMove)
		
		async function onForcedMove() {
			bot.removeListener('forcedMove', onForcedMove)
			
			console.log('at ' + someoneWithASignShop)
			await sleep(2000)
			
			const sign = bot.findBlock({
				matching: isMatchingWallSign,
				maxDistance: 4
			})
			
			if (!sign) {
				throw 'Where the fuck is the sell sign?'
			}
			
			console.log("Buying a sign from a sign", sign)
			await sleep(500)
			
			bot.on('windowOpen', onWindowOpen2)
			
			bot.openBlock(sign, mineflayer.Chest)
			await sleep(1000)
			
			async function onWindowOpen2(window) {
				bot.removeListener('windowOpen', onWindowOpen2)
				
				console.log('Chest trade window opened')
				
				await sleep(2000)
				
				let acceptTrade = window.slots.filter(item => item && item.name == 'stained_glass' && item.metadata == 5)			
				acceptTrade = acceptTrade[0]
				
				const itemType = acceptTrade.type
				const metadata = acceptTrade.metadata
				
				const sourceStart = 0
				const sourceEnd = window.inventorySlotStart
				const destStart = window.inventorySlotStart
				const destEnd = window.inventorySlotStart + 8
				
				const options = {
					window,
					itemType,
					metadata,
					count: 1,
					sourceStart, sourceEnd, 
					destStart, destEnd
				}
				
				console.log('Trying to accept sign trade');

				bot.transfer(options, async (err) => {
					if (err) console.error(err)
					else console.log("Bought a sign!")
				
					if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

					bot.chat('/is go')
			
					bot.on('forcedMove', onForcedMove2)
					
					async function onForcedMove2() {
						bot.removeListener('forcedMove', onForcedMove2)
						console.log('We are back home')
						await placeSign(bot)
						
						resolve()
					}
					
				})
			}
			
		}
	})	
	
}


async function placeSign(bot) {
	// We have a sign in inventory and are on our is.
	// The sign is in our hand
	await sleep(1000)
	bot.placeBlock(bot.blockAt(bot.entity.position.offset(0, -1, 0)), vec3(0, 1, 0), () => {

		console.log('Block placed')
	})
	
	await sleep(2000)
	console.log('Placed a sign')
		
	const signBlock = bot.findBlock({
		matching: isMatchingType
	})
	
	bot.updateSign(signBlock, '[mobcoin]\n\n\n')
	
	await sleep(1000)
	
}

function isMatchingWallSign(block) {
	return block && block.name.indexOf("wall") != -1 && block.name.indexOf("sign") != -1;
}
function isMatchingType(block) {
	return block && block.name.indexOf("sign") != -1;
}


function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

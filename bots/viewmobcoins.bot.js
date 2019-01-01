module.exports.viewMobCoins = viewMobCoins

const movearoundBot = require('./movearound.bot.js');

async function viewMobCoins(bot) {
	
	bot.mobCoin = bot.mobCoin || {}
		
	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: viewing mobcoins"))
		}, 60 * 1000)

		bot.on('message', onMessage)
		
		setTimeout(async () => {
			await sleep(1000);
			await movearoundBot.moveAroundUntilCommandAccess(bot)
			await sleep(500);
			
			console.log('Sending /mobcoins viewcoins ' + bot.username)
			bot.chat('/mobcoins viewcoins ' + bot.username);
		})
		
		function onMessage(jsonMessage) {
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
			
			if (msg.indexOf("Your Mob Coins:") != -1) {
				
				let coins = parseMobCoinAmmount(msg)
				bot.mobCoin.count = coins
				
				clearTimeout(watchDogId)
				bot.removeListener('message', onMessage)
				resolve(bot)
			}
		}
	})
}

function parseMobCoinAmmount(msg) {
	let coins = msg.split('Your Mob Coins: ')[1].split(' ')[0];
	coins = parseInt(coins.replace(',', '').replace('.', ''));
	console.log("Coins: ", coins)
	return coins
}


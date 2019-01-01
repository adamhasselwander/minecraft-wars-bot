const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const dropmobcoinsBot = require('./dropmobcoins.bot.js');
const movearoundBot = require('./movearound.bot.js');
const viewmobcoinsBot = require('./viewmobcoins.bot.js');

module.exports.dropMobCoins = dropMobCoins

async function dropMobCoins(masterBot, slaveBot) {

	await loginBot.spawnAndLogin(slaveBot)
	await activatesignBot.activateSign(slaveBot)
	await viewmobcoinsBot.viewMobCoins(slaveBot)
	
	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Drop mobcoins"))
		}, 60 * 10 * 1000)
		
		slaveBot.on('message', (jsonMessage) => {
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
 			
			if (msg.indexOf('coopaccept') != -1 && msg.length > '/is coopaccept  '.length) {
				slaveBot.chat('/is coopaccept');
				console.log('Sending /is coopaccept');
			}
		})

		slaveBot.chat('/tpa ' + masterBot.username)
		slaveBot.on('forcedMove', onForcedMove)
				
		async function onForcedMove() {
			console.log("WE TELEPORTED!!")
			
			slaveBot.removeListener('forcedMove', onForcedMove);
			masterBot.chat('/is coop ' + slaveBot.username)
			
			slaveBot.setControlState('left', true)
			slaveBot.setControlState('forward', true)
			
			await sleep(1000)
			
			slaveBot.clearControlStates()
			slaveBot.lookAt(
            masterBot.entity.position.offset(0, masterBot.entity.height, 0))
			
			await sleep(500)
			
			while(slaveBot.mobCoin.count > 0) {
				let d = Math.min(slaveBot.mobCoin.count, 2000);
				slaveBot.mobCoin.count -= d;
				slaveBot.chat('/mobcoins withdraw ' + d)
				await sleep(2000)
				await tossInventory(slaveBot)
			}

			let homeorgo = ['home', 'go'][Math.floor(Math.random() * 2)];
	 		
			slaveBot.on('forcedMove', onForcedMoveDc)
			slaveBot.chat('/is ' + homeorgo)
		}
		
		async function onForcedMoveDc() {
			resolve()
		}
		
		async function tossInventory(bot) {
			console.log("Dropping inventory!");
			let stacks = bot.inventory.items().filter(item => !!item.name);
			for (let stack of stacks) {
				bot.tossStack(stack);
				await sleep(500);
			}
		}
	})
}


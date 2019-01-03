const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const dropmobcoinsBot = require('./dropmobcoins.bot.js');
const movearoundBot = require('./movearound.bot.js');
const viewmobcoinsBot = require('./viewmobcoins.bot.js');

module.exports.dropMobCoins = dropMobCoins
module.exports.dropInventory = dropInventory

async function dropMobCoins(masterBot, slaveBot) {

	await loginBot.spawnAndLogin(slaveBot)
	await activatesignBot.activateSign(slaveBot)
	await viewmobcoinsBot.viewMobCoins(slaveBot)

   await setupAndTp(masterBot, slaveBot)

   await sleep(500)
   
   while(slaveBot.mobCoin.count > 0) {
      let d = Math.min(slaveBot.mobCoin.count, 2000);
      slaveBot.mobCoin.count -= d;
      slaveBot.chat('/mobcoins withdraw ' + d)
      await sleep(2000)
      await tossInventory(slaveBot, 
         (item) => item.displayName.indexOf('unflower') != -1)
   }

   let homeorgo = ['home', 'go'][Math.floor(Math.random() * 2)];
   
   slaveBot.once('forcedMove', resolve)
   slaveBot.chat('/is ' + homeorgo)

}

async function dropInventory(masterBot, slaveBot) {

	await loginBot.spawnAndLogin(slaveBot)
   await setupAndTp(masterBot, slaveBot)
   await tossInventory(slaveBot) 

}

async function setupAndTp(masterBot, slaveBot) {

	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Drop mobcoins"))
		}, 60 * 10 * 1000)

      bot.chatAddPattern(/coopaccept/, "coopAccept")
      bot.on("coopAccept", () => {
         slaveBot.chat('/is coopaccept');
         console.log('Sending /is coopaccept');
		})

		slaveBot.chat('/tpa ' + masterBot.username)
		slaveBot.once('forcedMove', onForcedMove)
				
		async function onForcedMove() {
			console.log("WE TELEPORTED!!")
			
			masterBot.chat('/is coop ' + slaveBot.username)
			
			slaveBot.setControlState('left', true)
			slaveBot.setControlState('forward', true)
			
			await sleep(1000)
			
			slaveBot.clearControlStates()
			slaveBot.lookAt(
            masterBot.entity.position.offset(0, masterBot.entity.height, 0))
			
         resolve()
		}
		
	})

}

async function tossInventory(bot, filter = (item) => true) {
   console.log("Dropping inventory!");
   let stacks = bot.inventory.items()
      .filter(item => 
         item && item.name && filter(item));

   for (let stack of stacks) {
      bot.tossStack(stack);
      await sleep(500);
   }
}


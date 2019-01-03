const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const movearoundBot = require('./movearound.bot.js');
const viewmobcoinsBot = require('./viewmobcoins.bot.js');

module.exports.dropMobCoins = dropMobCoins
module.exports.dropInventory = dropInventory
module.exports.tossInventory = tossInventory

async function dropMobCoins(masterBot, slaveBot) {

	await loginBot.spawnAndLogin(slaveBot)
	await activatesignBot.activateSign(slaveBot)
	await viewmobcoinsBot.viewMobCoins(slaveBot)

   if (slaveBot.mobCoin.count <= 0) {
      console.log('No coins, giving up early!')
      return 
   }
   await setupAndTp(masterBot, slaveBot)

   await sleep(500)
   
   while(slaveBot.mobCoin.count > 0) {
      let d = Math.min(slaveBot.mobCoin.count, 2000);
      slaveBot.mobCoin.count -= d;
      slaveBot.chat('/mobcoins withdraw ' + d)
      await sleep(2000)
      await tossInventory(slaveBot, 
         { filter: (item) => item.displayName.indexOf('unflower') != -1 })
   }

   let homeorgo = ['home', 'go'][Math.floor(Math.random() * 2)];

	return new Promise((resolve, reject) => {
   	const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Timeout is go"))
		}, 60 * 10 * 1000)

      slaveBot.once('forcedMove', resolve)
      slaveBot.chat('/is ' + homeorgo)

   })

}

async function dropInventory(masterBot, slaveBot, emptyStacks) {

	await loginBot.spawnAndLogin(slaveBot)
	await movearoundBot.moveAroundUntilCommandAccess(slaveBot)
   await setupAndTp(masterBot, slaveBot)
   await sleep(800)
   await tossInventory(slaveBot, { maxStacks: emptyStacks }) 

}

async function setupAndTp(masterBot, slaveBot) {
   
   slaveBot.chatAddPattern(/coopaccept/, "coopAccept")
   slaveBot.on("coopAccept", () => {
      slaveBot.chat('/is coopaccept');
      console.log('Sending /is coopaccept');
   })

   let d = 0
   do {
      await tpAndMove(masterBot, slaveBot)
      d = slaveBot.entity.position.distanceTo(masterBot.entity.position)
      console.log('Distance between bots: ' + d)
      await sleep(600)
   }
   while (d > 3.6 || d < 1.5)

}

async function tpAndMove(masterBot, slaveBot) {
	
   return new Promise((resolve, reject) => {
      const watchDogId = setTimeout(() => {
         reject(new Error("Timeout: Tp and move"))
      }, 10 * 10 * 1000)

		slaveBot.once('forcedMove', onForcedMove)
		slaveBot.chat('/tpa ' + masterBot.username)
		console.log('Sending tpa')	

		async function onForcedMove() {
			console.log("WE TELEPORTED!!")
			
			masterBot.chat('/is coop ' + slaveBot.username)
			
			slaveBot.setControlState('left', true)
			slaveBot.setControlState('forward', true)

			await sleep(1000)
	
			slaveBot.clearControlStates()
			slaveBot.lookAt(
            masterBot.entity.position.offset(0, masterBot.entity.height / 2, 0))
			
         resolve()
		}

	})

}

async function tossInventory(bot, options) {
   options = options || {}
   const filter = options.filter || ((item) => true)
   let maxStacks = options.maxStacks || 1000

   console.log("Dropping inventory!")
   let stacks = bot.inventory.slots
      .filter(item => 
         item && item.name && filter(item))

   console.log('Stacks to drop ' + stacks.length)

   await sleep(1000)
   for (let stack of stacks) {
      bot.tossStack(stack, (err) => {
         if (err) console.log('Could not throw stack') 
      })
      await sleep(700)

      bot.tossStack(stack, (err) => {
         if (err) console.log('Could not throw stack a second time') 
      })
      await sleep(500)

      maxStacks--
      if (maxStacks <= 0) break
   }

   stacks = bot.inventory.slots
      .filter(item => 
         item && item.name && filter(item))

   if (stacks.length > 0) {
      console.log('Some stacks could not be dropped!',
         stacks.map(it => it.name))
   }

}


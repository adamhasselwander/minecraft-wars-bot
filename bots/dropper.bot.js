const mineflayer = require('mineflayer')
const fs = require('fs');
const Vec3 = require('vec3').Vec3

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const dropBot = require('./drop.bot.js');
const movearoundBot = require('./movearound.bot.js');

const mode = process.argv[0]
if (process.argv.length != 1 || !(mode == 'inv' || mode == 'coins') {
   console.log('Usage : node dropper.bot.js <inv|coins>')
   process.exit(1)
}

(async function() {
	await dropCoinsAccounts(mode)
})();

async function dropAllAccounts(mode) {
	console.log("We are going to drop stuff!");
	console.log()
	
	let master = helper.readAccounts().filter(a => a.isMaster)[0]
	if (!master) {
		throw new Error("There is no master defined!" + 
         " Add a semicolon (username:password:) to set the master")
	}
	
	let slaveBot = null;
	
	const masterBot = mineflayer.createBot({
	  host: "pvpwars.net",
	  port: 25565,
	  username: master.username,
	  password: master.password,
	  version: '1.8',
	  verbose: true
	})

   bot.chatAddPattern(/\/tpaccept/, "tpAccept")
   bot.chatAddPattern(/.\/is coop (.*)/, "isCoop")

   bot.on("tpAccept", () => {
      masterBot.chat('/tpaccept')
      console.log('Sending tpaccept')
   })

   bot.on("isCoop", (msg) => {
      let username = parts.trim().split(' ')[0].trim();
      
      masterBot.chat('/is coop ' + username);
      console.log('Sending /is coop ' + username);
      console.log("'" + msg + "'");
   })   
   
   await loginBot.loginAndSpawn(masterBot)
	console.log("Master loggedin")

   await movearoundBot.moveAroundUntilCommandAccess(masterBot)
   await sleep(1000)
           
   masterBot.chat('/is go')
   
   let depositId = 
      setTimeout(depositMobCoins, 7 * 1000 + Math.random() * 1000 * 5)

   async function depositMobCoins() {
      if (mode != 'coins') return

      console.log('Depositing mobcoins')
      let coinsInInventory = masterBot.inventory.items()
            .filter(item => item.displayName.indexOf('unflower') != -1)
            .map(item => item.count).reduce((a, b) => a + b, 0)

      let coinsToDeposit = coinsInInventory - Math.floor(Math.random() * 200)

      if (coinsToDeposit > 100) {
         console.log('Total mobcoins in inventory: ' + coinsInInventory +
            ' coins to deposit: ' + coinsToDeposit)
         masterBot.chat('/mobcoins deposit ' + coinsToDeposit)
      }

      depositId = setTimeout(depositMobCoins, 7 * 1000 + Math.random() * 1000 * 5)
   }
 
   for (let acc of helper.readAccounts()) {
      if (acc.username == master.username) continue
      
      console.log()
      console.log()
      console.log("--- Dropping for " + acc.username + " ---")
      
      const slaveBot = mineflayer.createBot({
        host: "pvpwars.net",
        port: 25565,
        username: acc.username,
        password: acc.password,
        version: '1.8',
        verbose: true
      })
      
      try {

         if (mode == 'coins') {
            await dropBot.dropMobCoins(masterBot, slaveBot)
            console.log("Done dropping coins for " + slaveBot.username)
         } else if (mode == 'inv') {
            await dropBot.dropInventory(masterBot, slaveBot)
            console.log("Done dropping inventory for " + slaveBot.username)
         }

      } catch (err) {
         
         console.log(err)
         console.log("There was an error, it is printed above")

      } finally {
         
         console.log("Disconnecting pawn")
         slaveBot.removeAllListeners()
         await sleep(1000)
         await helper.disconnectSafely(bot)
      }
      
      console.log("--- /Dropping for " + acc.username + " ---")
      console.log()
      
   }

   clearTimeout(depositId)
   console.log("Disconnecting master")
   
   masterBot.removeAllListeners()
   masterBot.chat('/is go')
   await sleep(1000)

   await helper.disconnectSafely(bot)
  
}


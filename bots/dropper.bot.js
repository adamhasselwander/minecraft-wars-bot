const mineflayer = require('mineflayer')
const fs = require('fs');

const helper = require('./helper.js')
const loginBot = require('./login.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const dropBot = require('./drop.bot.js');
const movearoundBot = require('./movearound.bot.js');

const mode = process.argv[2]
if (process.argv.length != 3 || !(mode == 'inv' || mode == 'coins')) {
   console.log('Usage : node dropper.bot.js <inv|coins>')
   process.exit(1)
}

(async function() {
	await dropAllAccounts(mode)
   process.exit(1)
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

   masterBot.chatAddPattern(/\/tpaccept/, "tpAccept")
   masterBot.chatAddPattern(/.\/is coop (.*)/, "isCoop")
   masterBot.chatAddPattern(/.\/drop inv(.*)/, "dropInv")

   masterBot.on("tpAccept", () => {
      masterBot.chat('/tpaccept')
      console.log('Sending tpaccept')
   })

   masterBot.on("isCoop", (msg) => {
      let username = msg.trim().split(' ')[0].trim();
      
      masterBot.chat('/is coop ' + username);
      console.log('Sending /is coop ' + username);
      console.log("'" + msg + "'");
   })   
   
   masterBot.on("dropInv", (user) => {
      if (user && user.trim()) {
         user = user.trim()
         const p = masterBot.players[user]

         if (!p) {
            console.log('Could not find user to look at ' + user)
         } else {
			   masterBot.lookAt(
               p.entity.position.offset(0, masterBot.entity.height / 2, 0))
         }
      }

      dropBot.tossInventory(masterBot) 
   })

   await loginBot.spawnAndLogin(masterBot)
	console.log("Master loggedin")

   await movearoundBot.moveAroundUntilCommandAccess(masterBot)
   await sleep(1000)
           
   await movearoundBot.goHome(masterBot)
   await sleep(1000)
   const homePos = masterBot.entity.pos

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

      if (masterBot.entity.pos.distanceTo(homePos) > 10) {
         console.log('Master seems to have moved away from home, telporting back')
         await movearoundBot.goHome(masterBot)
      }
      
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
         await loginBot.waitForErrors(slaveBot)

         if (mode == 'coins') {

            await dropBot.dropMobCoins(masterBot, slaveBot)
            console.log("Done dropping coins for " + slaveBot.username)

         } else if (mode == 'inv') {

            let emptyStacks = masterBot.inventory.slots.filter(it => !it).length
            emptyStacks -= 9;
            if (emptyStacks <= 0) break

            console.log('Max stacks to drop: ' + emptyStacks)
            await dropBot.dropInventory(masterBot, slaveBot, emptyStacks)
            console.log("Done dropping inventory for " + slaveBot.username)

         }

      } catch (err) {
         
         console.log(err)
         console.log("There was an error, it is printed above")

      } finally {
         
         console.log("Disconnecting pawn")
         slaveBot.removeAllListeners()
         await sleep(5000)
         await helper.disconnectSafely(slaveBot)
      }
      
      console.log("--- /Dropping for " + acc.username + " ---")
      console.log()
      
   }

   clearTimeout(depositId)
   console.log("Disconnecting master")
   
   masterBot.removeAllListeners()
   await movearoundBot.goHome(masterBot)
   await sleep(1000)

   await helper.disconnectSafely(masterBot)
  
}


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
const movearoundBot = require('./movearound.bot.js');

(async function() {
   let item = await getItemToBuy()
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
      
      console.log()
      console.log('--- ' + username + ' ---')
      console.log()

      try {
         await loginBot.waitForErrors(bot)
         await loginBot.spawnAndLogin(bot)
         await movearoundBot.moveAroundUntilCommandAccess(bot)
         await sleep(1000)
         await buyItem(bot, item)
      } catch (err) {
         console.log(err)
      } finally {
         console.log('Disconnecting player ' + bot.username)
         await helper.disconnectSafely(bot)
      }

      console.log()
      console.log('--- /' + username + ' ---')
      console.log()

      await sleep(2000)
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
   
   await loginBot.spawnAndLogin(masterBot)
   await movearoundBot.moveAroundUntilCommandAccess(masterBot)
   
   return new Promise((resolve, reject) => {
               
      console.log('Executing /mobcoins')
      masterBot.chat('/mobcoins')
      
      masterBot.once('windowOpen', onWindowOpen)
      
      async function onWindowOpen(window) {
         
         console.log('Mobcoin shop opened with title: ' + window.title)
         
         await sleep(2000)
         
         let items = window.slots.filter((item, index) => {
            if (!item) return false

            item.slot = index

            if (item.name == 'stained_glass_pane' || item.slot >= 36)
               return false

            item.desc = item.nbt.value.display.value.Name.value
               .replace(/§[0-9a-flnmokr]/g, '')

            console.log(item.slot + ' ' + item.name +' ' + item.desc)

            return true
         })
         
         console.log("Please enter a number")
         
         masterBot.closeWindow(window)
         
         rl.on('line', onLine)
         await helper.disconnectSafely(masterBot)
         
         async function onLine(line) {
            try {
               let choice = parseInt(line);
               let item = items.filter(it => it.slot == choice)[0]

               console.log('Selected item: ' + item.desc)
               rl.off('line', onLine)                 
               resolve(item)
            } catch {
               console.log("Could not parse the choice " + line)
               console.log("Please enter a new number")
            }
         }
      }
      
   })
   
}

async function buyItem(bot, item) {
   
   bot.chatAddPattern(/You have purchased/, "mobcoinShopped")
   bot.chatAddPattern(/Mob Coins to purchase this./, "mobcoinNotEnough")   
   
   if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

   return new Promise((resolve, reject) => {
      let windowHasOpenend = false
      const watchDogId = setTimeout(() => {
         if (windowHasOpenend) return
         reject(new Error("Timeout: Could not open mobcoin window"))
      }, 10 * 1000)
      
      bot.chat('/mobcoins')                  
      bot.once('windowOpen', onWindowOpen)
         
      async function onWindowOpen(window) {
         windowHasOpenend = true
         let waitForBuy = true 
         await sleep(500)
         
         bot.once("mobcoinShopped", onMobcoinShopped)
         bot.once("mobcoinNotEnough", onMobcoinNotEnough) 

         async function onMobcoinShopped() {
            bot.off("mobcoinNotEnough", onMobcoinNotEnough)
            waitForBuy = false

            console.log('Souccessfully bought your item, buying another one!')
            
            for (let i = 1; i < 7; i++) {
               try {
                  await buyItem(bot, item)
                  break
               } catch(err){
                  if (i > 3) console.log(err.message)
                  if (i > 5) console.log(err)
               }
            }
            resolve()
         }

         async function onMobcoinNotEnough() {
            bot.off("mobcoinShopped", onMobcoinShopped)
            waitForBuy = false

            console.log('Not enough mob coins to buy more items!')
            resolve()
         } 

         setTimeout(async () => {
            let tries = 2
            while (waitForBuy && --tries > 0) {
               try {
                  await waitForBuyClick(bot, item)
                  return
               } catch(err) {
                  await sleep(500)
               }
            }

            bot.off("mobcoinShopped", onMobcoinShopped)
            bot.off("mobcoinNotEnough", onMobcoinNotEnough)

            if (!waitForBuy) return 

            console.log('Someting went wrong, aborting ' + window.title)
            reject(new Error("Could not buy item"))

         })
      }
   })
}

async function waitForBuyClick(bot, item) {

   return new Promise((resolve, reject) => {
      const watchDogId = setTimeout(() => {
         bot.off("mobcoinShopped", resolve)
         bot.off("mobcoinNotEnough", resolve) 

         reject(new Error("Timeout: Buy click"))
      }, 1200)
 
      bot.once("mobcoinShopped", resolve)
      bot.once("mobcoinNotEnough", resolve) 

      bot.clickWindow(item.slot, 0, 0, (err) => {
         if (err) console.error(err);
      })
      
      console.log("Trying to buy item: " + item.desc);

   })

}

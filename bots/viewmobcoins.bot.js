module.exports.viewMobCoins = viewMobCoins

const movearoundBot = require('./movearound.bot.js');

async function viewMobCoins(bot) {
   
   bot.mobCoin = bot.mobCoin || {}

   await sleep(1000);
   await movearoundBot.moveAroundUntilCommandAccess(bot)
   await sleep(500);
   
   return new Promise((resolve, reject) => {
      
      const watchDogId = setTimeout(() => {
         reject(new Error("Timeout: viewing mobcoins"))
      }, 60 * 1000)

      bot.chatAddPattern(/Your Mob Coins:(.*)/, "mobcoinsCount")
      bot.once("mobcoinsCount", async (msg) => {
   
         let coins = parseMobCoinAmmount(msg)
         bot.mobCoin.count = coins
         
         clearTimeout(watchDogId)
         resolve()

      })

      console.log('Sending /mobcoins viewcoins ' + bot.username)
      bot.chat('/mobcoins viewcoins ' + bot.username);

   })
}

function parseMobCoinAmmount(msg) {
   let coins = msg.trim().split(' ')[0];
   coins = parseInt(coins.replace(',', '').replace('.', ''));
   console.log("Coins: " + coins)
   return coins
}


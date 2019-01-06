const Vec3 = require('vec3').Vec3
const helper = require('./helper.js')
const getsignBot = require('./getsign.bot.js')
const movearoundBot = require('./movearound.bot.js')

module.exports.activateSign = activateSign

async function activateSign(bot) {
   bot.mobCoin = bot.mobCoin || {}
   let intervalId = 0
   const pos = bot.entity.position

   const signPos = helper.getSignPosition(bot.username, pos)
   const distSign = pos.distanceTo(signPos)
   if (distSign > 6) {
      console.log('We are far away from our sign, teleporting home')
      await movearoundBot.goHome(bot)
   } else if (distSign > 1) {
      console.log('Distance to sign ' + Math.floor(distSign))
   }

   await sleep(500)
   
   const sign = bot.findBlock({
      matching: (it) => it && it.name.indexOf('sign') != -1,
      maxDistance: 3,
   })

   if (!sign) {
      await getsignBot.getSign(bot)
      return await activateSign(bot)
   }
   
   console.log("Activating sign")
   
   return new Promise((resolve, reject) => {
      
      const watchDogId = setTimeout(() => {
         reject(new Error("Timeout: Activating signs"))
      }, 10 * 1000)
      
      bot.chatAddPattern(/You must wait (.*)/, "mobcoinTime")
      bot.chatAddPattern(/ve received(.*)Mob Coins/, "mobcoinCount")
      
      async function onMobcoinTime(msg) {
         console.log("Detected sign activation")
         clearInterval(intervalId)

         let time = parseMobCoinTime(msg)
         
         if (time) {
            bot.mobCoin.nextSignTime = time.getTime()

            const timeMin = Math.floor((time.getTime() - 
               (new Date()).getTime()) / (60 * 1000));
            console.log('Time until next reward ' + timeMin + 'min')
         }

         await sleep(600) // to increase the chance to get mobcoin collected count
         bot.off("mobcoinCount", onMobcoinCount)
         resolve(bot)

      }

      async function onMobcoinCount(msg) {
         console.log("Found mobcoins to collect")
         helper.updateSignPosition(sign, bot.username)
         bot.mobCoin.collected = parseMobCoinCount(msg)
      }

      setTimeout(() => {
         bot.once("mobcoinTime", onMobcoinTime)
         bot.once("mobcoinCount", onMobcoinCount)
      }, 500)
    
      intervalId = setInterval(() => {
         bot.activateBlock(sign)
      }, 200)

   })
}

function parseMobCoinCount(msg) {
   try {
      return parseInt(msg.trim())
   } catch (err) {
      console.log("Could not parse mob coin count from text", msg)
      return 0
   }
}

function parseMobCoinTime(msg) {
   const parts = msg.split(' ')
   
   try {

      let min = parts[0].substring(0, parts[0].length - 1)
      let sec = parts[1].substring(0, parts[1].length - 1)
      
      min = parseInt(min)
      sec = parseInt(sec)
      
      let d = new Date();
      d.setMinutes(d.getMinutes() + min)
      d.setSeconds(d.getSeconds() + sec)
      
      return d

   } catch (err) {
      console.log("Could not parse mobcoin time from msg " + msg)
      return null
   }
}


const helper = require('./helper.js')
const movearoundBot = require('./movearound.bot.js')
const getsignBot = require('./getsign.bot.js')

module.exports.activateSign = activateSign

async function activateSign(bot) {
	bot.mobCoin = bot.mobCoin || {}
	let intervalId = 0

	await sleep(500)
	
	const sign = bot.findBlock({
		matching: (it) => it && it.name.indexOf('sign') != -1,
	})

	if (!sign) {
		await getsignBot.getSign(bot)
		return await activateSign(bot)
	}
	
	console.log("Activating sign")
	
	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Activating signs"))
		}, 60 * 1000)
		
      bot.chatAddPattern(/You must wait (.*)/, "mobcoinTime")
		bot.chatAddPattern(/ve received(.*)Mob Coins/, "mobcoinCount")
      bot.once("mobcoinTime", onMobcoinTime)
      bot.once("mobcoinCount", onMobcoinCount)
   
      async function onMobcoinTime(msg) {
         console.log("Detected sign activation")
         clearInterval(intervalId)

         let time = parseMobCoinTime(msg)
         
         if (time) {
            bot.mobCoin.nextSignTime = time.getTime()
            console.log('Time until next reward ' +
               Math.floor((time.getTime() - (new Date()).getTime()) / (60 * 1000))
            + 'min')
         }

         await sleep(600) // to increase the chance to get mobcoin collected count
         bot.off("mobcoinCount", onMobcoinCount)
         resolve(bot)

      }

      async function onMobcoinCount(msg) {
         console.log("Found mobcoins to collect")
         bot.mobCoin.collected = parseMobCoinCount(msg)
      }
	   
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


const helper = require('./helper.js')
const movearoundBot = require('./movearound.bot.js')
const getsignBot = require('./getsign.bot.js')

module.exports.activateSign = activateSign

async function activateSign(bot) {
	bot.mobCoin = bot.mobCoin || {}
	
	await sleep(500)
	
	const sign = bot.findBlock({
		matching: isMatchingType,
	})

	if (!sign) {
		await getsignBot.getSign(bot)
		return await activateSign(bot)
	}
	
	console.log("Activating sign")
	await sleep(200)
	bot.activateBlock(sign)
	await sleep(1000)
	bot.activateBlock(sign) // Twice to make sure a new time 
                           // is given (else the program wont stop!)
	
	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: Activating signs"))
		}, 60 * 1000)

		bot.on('message', onMessage)
		
		async function onMessage(jsonMessage) {
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
			
			if (msg.indexOf("(( You must wait") != -1) {
				console.log("Detected sign activation")
				
				let time = parseMobCoinTime(msg)
				
				if (time) bot.mobCoin.nextSignTime = time.getTime()
				resolve(bot)
			}
		}
	})
}

function parseMobCoinTime(msg) {

	const parts = msg.split(' ')
	
	let index = -1
	parts.filter((p, ind) => { // I do not usually write javascript
		if (p.indexOf('wait') != -1) index = ind
		return true
	})
	
   try {

      let min = parts[index + 1].substring(0, parts[index + 1].length - 1)
      let sec = parts[index + 2].substring(0, parts[index + 2].length - 1)
      
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

function isMatchingType(block) {
	return block && block.name.indexOf("sign") != -1;
}


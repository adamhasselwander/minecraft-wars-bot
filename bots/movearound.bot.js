const heper = require('./helper.js')

module.exports.moveAroundClickUntilWindow = moveAroundClickUntilWindow
module.exports.moveAroundUntilCommandAccess = moveAroundUntilCommandAccess

async function moveAroundClickUntilWindow(bot) {
	console.log("Moving around")
   let moveIntervalId = 0	
	
   return new Promise((resolve, reject) => {
      bot.once('windowOpen', onWindowOpen)

		const watchDogId = setTimeout(() => {
			bot.clearControlStates();
         bot.off('windowOpen', onWindowOpen)
			
			if (moveIntervalId) clearTimeout(moveIntervalId);
			moveIntervalId = 0;
			
			reject(new Error("Timeout: Moving around until cmd access"))
		}, 60 * 1000)
		
		async function onWindowOpen() {
			
         bot.clearControlStates();
         
         if (moveIntervalId) clearTimeout(moveIntervalId);
         moveIntervalId = 0;
         
         console.log()
         console.log('Window opened!')
         
         resolve()
		}

      setTimeout(async () => {
			const baseTime = 300, jitter = 600;
			const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump']
				
			moveIntervalId = setTimeout(moveOnce)
			
			async function moveOnce() {
				let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]
				
				process.stdout.write(" " + ctl)
				
				bot.setControlState(ctl, true)
				await sleep(baseTime + Math.random() * jitter)
				
				await sleep(Math.random() * jitter)
            if (!moveIntervalId) return
				
				if (Math.random() > 0.4) {
					bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
					await sleep(baseTime * 2 + Math.random() * jitter)
               if (!moveIntervalId) return
					process.stdout.write(" yaw")
				}
				
				bot.setControlState(ctl, false)
				await sleep(Math.random() * jitter)
				
				if (moveIntervalId) moveIntervalId = setTimeout(moveOnce)
			}
		})

	})
	
}

async function moveAroundUntilCommandAccess(bot) {
	console.log("Moving around")
	
	return new Promise((resolve, reject) => {

		bot.chatAddPattern(/Island Help/, "help")
      bot.once("help", onHelp)

		let helpCommandId = 0
		let moveIntervalId = 0
		
		const watchDogId = setTimeout(() => {
			bot.clearControlStates();
			bot.off('help', onHelp)
			
         if (helpCommandId) clearTimeout(helpCommandId);
			if (moveIntervalId) clearTimeout(moveIntervalId);
			moveIntervalId = 0;
			
			reject(new Error("Timeout: Moving around until cmd access"))
		}, 60 * 1000)
		
		async function onHelp() {
			
         bot.clearControlStates();
         
         if (helpCommandId) clearTimeout(helpCommandId);
         if (moveIntervalId) clearTimeout(moveIntervalId);
         moveIntervalId = 0;
         
         console.log()
         console.log('Now able to send commands')
         
         resolve()
		}
		
		helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)
		
		async function sendHelpCommand() {
			bot.chat('/help')
			console.log()
			console.log('Executing /help')
			helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)
		}
		
		setTimeout(async () => {
			const baseTime = 300, jitter = 600;
			const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump']
				
			moveIntervalId = setTimeout(moveOnce)
			
			async function moveOnce() {
				let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]
				
				process.stdout.write(" " + ctl)
				
				bot.setControlState(ctl, true)
				await sleep(baseTime + Math.random() * jitter)
				
				await sleep(Math.random() * jitter)
            if (!moveIntervalId) return
				
				if (Math.random() > 0.4) {
					bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
					await sleep(baseTime * 2 + Math.random() * jitter)
               if (!moveIntervalId) return
					process.stdout.write(" yaw")
				}
				
				bot.setControlState(ctl, false)
				await sleep(Math.random() * jitter)
				
				if (moveIntervalId) moveIntervalId = setTimeout(moveOnce)
			}
		})
	})
}


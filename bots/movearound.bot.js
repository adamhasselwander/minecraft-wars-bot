const heper = require('./helper.js')

module.exports.moveAround = moveAround
module.exports.moveAroundUntilCommandAccess = moveAroundUntilCommandAccess

async function moveAround(bot) {
	console.log("Moving around")
	
	const baseTime = 300, jitter = 800, njitter = 4, n = 4;
	const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump']
	
	bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
	await sleep(baseTime + Math.random() * jitter)
	
	let t = Math.floor(Math.random() * njitter) + n;
	for (let i = 0; i < t; i++) {
		let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]
		
		process.stdout.write(" " + ctl)
		
		bot.setControlState(ctl, true)
		await sleep(baseTime + Math.random() * jitter)
		
		await sleep(Math.random() * jitter)
		
		if (Math.random() > 0.4) {
			bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
			await sleep(baseTime * 2 + Math.random() * jitter)
			process.stdout.write(" yaw")
		}
		
		bot.setControlState(ctl, false)
	}
	console.log()
	
	bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
	await sleep(baseTime * 2 + Math.random() * jitter)
	
	bot.clearControlStates();
}

async function moveAroundUntilCommandAccess(bot) {
	console.log("Moving around")
	
	return new Promise((resolve, reject) => {

		bot.on('message', onMessage)
		let helpCommandId = 0
		let moveIntervalId = 0
		
		const watchDogId = setTimeout(() => {
			bot.clearControlStates();
			bot.removeListener('message', onMessage)
			if (helpCommandId) clearTimeout(helpCommandId);
			if (moveIntervalId) clearTimeout(moveIntervalId);
			moveIntervalId = -1;
			
			reject(new Error("Timeout: Moving around until cmd access"))
		}, 60 * 1000)
		
		async function onMessage(jsonMessage) {
			let msg = jsonMessage.extra ? jsonMessage.extra.map(cm => cm.text).join('') : ''
			
			if (msg.indexOf("Island Help") != -1) {
				bot.clearControlStates();
				bot.removeListener('message', onMessage)
				
				if (helpCommandId) clearTimeout(helpCommandId);
				if (moveIntervalId) clearTimeout(moveIntervalId);
				moveIntervalId = -1;
				
				console.log()
				console.log('Now able to send commands')
				
				resolve(bot)
			}
		}
		
		helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)
		
		async function sendHelpCommand() {
			bot.chat('/help')
			console.log()
			console.log('Executing /help')
			helpCommandId = setTimeout(sendHelpCommand, 1000 + Math.random() * 3000)
		}
		
		setTimeout(async () => {
			const baseTime = 300, jitter = 800;
			const ctrls = [ 'forward', 'back', 'left', 'right', 'sprint', 'jump']
			
			bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
			await sleep(baseTime + Math.random() * jitter)
				
			moveIntervalId = setTimeout(moveOnce)
			
			async function moveOnce() {
				let ctl = ctrls[Math.floor(Math.random() * ctrls.length)]
				
				process.stdout.write(" " + ctl)
				
				bot.setControlState(ctl, true)
				await sleep(baseTime + Math.random() * jitter)
				
				await sleep(Math.random() * jitter)
				
				if (Math.random() > 0.4) {
					bot.look(Math.random() * Math.PI * 2, Math.random() * Math.PI - Math.PI / 2);
					await sleep(baseTime * 2 + Math.random() * jitter)
					process.stdout.write(" yaw")
				}
				
				bot.setControlState(ctl, false)
				await sleep(Math.random() * jitter)
				
				if (moveIntervalId != -1) moveIntervalId = setTimeout(moveOnce)
			}
		})
	})
}


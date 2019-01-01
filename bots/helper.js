const fs = require('fs');

global.sleep = sleep;

module.exports.writeAccountTimes = writeAccountTimes;
module.exports.readAccountTimes = readAccountTimes;

module.exports.writeAccountUsernames = writeAccountUsernames;
module.exports.readAccountUsernames = readAccountUsernames;

module.exports.writeAccountCoins = writeAccountCoins;
module.exports.readAccountCoins = readAccountCoins;

module.exports.readUsernames = readUsernames;

module.exports.readAccounts = readAccounts;

module.exports.disconnectSafely = disconnectSafely;


async function disconnectSafely(bot) {

   let hasEnded = false
	return new Promise((resolve, reject) => {
      
      bot.on('end', () => {
         bot.removeAllListeners()
         hasEnded = true
         resolve()
      })
      
      bot.quit()
      
      setTimeout(() => {
         if (hasEnded) return;
         bot.end()
         setTimeout(() => {
            bot.removeAllListeners()
            resolve()
         }, 3000) // incase end is never triggered
      }, 3000)

   })
}

function readUsernames() {
	const contents = JSON.parse(fs.readFileSync('usernames.txt', 'utf8'))
	
	let usernames = []
	
	Object.entries(contents).forEach(([email, val]) => {
		usernames.push(val.username);
	});
	
	return usernames
}

function readAccountCoins() {
	if (!fs.existsSync('mobcoins.txt')) writeAccountTimes({});
	return JSON.parse(fs.readFileSync('mobcoins.txt', 'utf8') || "{}")	
}
function writeAccountCoins(coins) {
	return fs.writeFileSync('mobcoins.txt', JSON.stringify(coins, null, 2))
}



function readAccounts(printDisabled = false) {
	const contents = fs.readFileSync('../accounts.txt', 'utf8')
	const lines = contents.split('\n')
	
	let accounts = []
	
	for (let line of lines) {

      if (!line) continue		

		if (line.split(':').length < 2) {
			console.log("Could not read the row (" + line.trim() +
            ") in accounts.txt, make sure it cotains username:password")

			continue
		}

      if (!line.split(':')[0]) {
         if (printDisabled) console.log('Account disabled ' + line.split(':')[1])
         continue
      }
		
		let parts = line.split(':')
		const username = parts[0].trim()
		const password = parts[1].trim()
		
		accounts.push({ username, password, isMaster: parts.length > 2 })
	}
	
   if (accounts.filter(acc => acc.isMaster).length > 1) 
      console.log('Warning found two masters, the first one will most likley be used')
   if (accounts.filter(acc => acc.isMaster).length < 1) 
      console.log('Warning found no master, some things may not work as expected')

	return accounts
}

function readAccountUsernames() {
	if (!fs.existsSync('usernames.txt')) writeAccountUsernames({});
	return JSON.parse(fs.readFileSync('usernames.txt', 'utf8') || "{}")	
}
function writeAccountUsernames(usernames) {
	return fs.writeFileSync('usernames.txt', JSON.stringify(usernames, null, 2))
}

function readAccountTimes() {
	if (!fs.existsSync('times.txt')) writeAccountTimes({});
	return JSON.parse(fs.readFileSync('times.txt', 'utf8') || "{}")	
}
function writeAccountTimes(times) {
	return fs.writeFileSync('times.txt', JSON.stringify(times, null, 2))
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}


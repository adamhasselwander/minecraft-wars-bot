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

module.exports.clickItemDesc = clickItemDesc;

module.exports.craftItem = craftItem;


async function clickItemDesc(bot, window, desc, clickBtn = 0) {

   let blocks = window.slots
      .filter((it, index) => {
         if (!it) return false

         let hasNbtName = 
            it.nbt && 
            it.nbt.value && 
            it.nbt.value.display &&
            it.nbt.value.display.value &&
            it.nbt.value.display.value.Name &&
            it.nbt.value.display.value.Name.value

         it.displayName = hasNbtName ? 
            it.nbt.value.display.value.Name.value
               .replace(/§[0-9a-flnmokr]/g, '') :
            it.displayName
         
         it.slot = index

         return true
      })

   let targetBlock = blocks.filter(s => s.displayName.indexOf(desc) != -1)[0]

   if (!targetBlock) {
      console.log("Only found", blocks.map(b => b.displayName), desc)
      throw new Error("Could not find a block with the given description")
   }

   console.log("Clicking", targetBlock.name) 

   return new Promise((resolve, reject) => {
		
		setTimeout(async () => {
			reject(new Error("Timeout: Clicking item with desc"))
		}, 20 * 1000)
	   
      bot.clickWindow(targetBlock.slot, 0, clickBtn, (err) => {
         if (err) reject(new Error(err))
         else resolve()
      })

   })
   
}

async function craftItem(bot, name, amount) {
   
   await sleep(500)
   const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name)
   const craftingTable = bot.findBlock({
      matching: (it) => it && it.type == 58
   })

   if (!item) throw new Error('Could not find the item')
   if (!craftingTable) throw new Error('No nerby crafting tables')
   
   let recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
   
   for (let i = 1; i < 10; i++) {
      if (recipe) break
      await sleep(200)
      recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
   }

   if (!recipe) throw new Error('Could not find a recipe')

   return new Promise((resolve, reject) => {
		
		setTimeout(() => {
			reject(new Error("Timeout: Clicking item with desc"))
		}, 20 * 1000)

	   try {
         bot.craft(recipe, amount, craftingTable, (err) => {
            if (err) reject(new Error(err))
            else resolve()
         })
      } catch (err) {
         reject(new Error(err))
      }

   })

}


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


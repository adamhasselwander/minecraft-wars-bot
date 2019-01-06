const mineflayer = require('mineflayer')

const helper = require('./helper.js')
const movearoundBot = require('./movearound.bot.js')
const activatesignBot = require('./activatesign.bot.js');
const vec3 = require('vec3')
const someoneWithASignShop = require('./settings.js').someoneWithASignShop

module.exports.getSign = getSign

async function getSign(bot) {
   console.log("Signs") 
   await movearoundBot.goHome(bot)

   await sleep(500)

   const sign = bot.findBlock({
		matching: (it) => it && it.name.indexOf('sign') != -1,
	})

	if (sign) return 
  	
	return new Promise((resolve, reject) => {
		
		const watchDogId = setTimeout(() => {
			reject(new Error("Timeout: shopping"))
		}, 60 * 1000)
    
      bot.once('windowOpen', async (window) => {

         bot.once('windowOpen', async (window) => {

            try {
               console.log("Another window!!")

               await sleep(300)
               await helper.clickItemDesc(bot, window, '+1')
               await sleep(400)
               await helper.clickItemDesc(bot, window, 'CONFIRM')
               
               bot.chatAddPattern(/You successfully bought/, "shopped")
               bot.once("shopped", async () => {
                  
                  console.log("Chopped some wood, will try to craft")

                  try {
                     bot.closeWindow(window);

                     async function waitForItem(name, amount) {
                        for (let i = 1; i < 15; i++) {

                           let c = bot.inventory.items()
                              .filter(it => it.name == name).map(it => it.count)

                           if (c.length > 0 && 
                               c.reduce((a, b) => a + b) >= amount) {
                              return;
                           }

                           await sleep(200)
                        }
                     }

                     await waitForItem('log', 2)
                     await helper.craftItem(bot, 'planks', 2)
                     
                     await waitForItem('planks', 8)
                     await helper.craftItem(bot, 'stick', 1)

                     await waitForItem('stick', 1)
                     await helper.craftItem(bot, 'sign', 1)

                     await waitForItem('sign', 1)
                     await placeSign(bot)
                     resolve()
         
                  } catch (err) {
                     reject(new Error(err))
                  }

               })
      
            } catch (err) {
               reject(new Error(err))
            }

         })
         
         try {

            console.log("Shop open, clicking stuff")
            await sleep(500)
            await helper.clickItemDesc(bot, window, 'Oak wood')
            
         } catch (err) {
            reject(new Error(err))
         }

      })

      bot.chat('/shop blocks')

   })

}


async function placeSign(bot) {
	
   // We have a sign in inventory and are on our is.

   let item = bot.inventory.slots.filter((it, index) => {
      if (!it) return false
      it.slot = index 
      return it.name == 'sign'
   })[0]

   for (let i = 1; i < 10; i++) {
      if (item) break

      await sleep(200)
      item = bot.inventory.slots.filter((it, index) => {
         if (!it) return false
         it.slot = index 
         return it.name == 'sign'
      })[0]
      
   }

   if (!item) {
      throw new Error("Could not find the sign")
   }

   bot.setQuickBarSlot(item.slot - 36)

	// The sign is in our hand
	
   await sleep(1000)
	bot.placeBlock(bot.blockAt(bot.entity.position.offset(0, -1, 0)), 
      vec3(0, 1, 0), () => {
		      console.log('Block placed')
	      })
	
	await sleep(2000)
	console.log('Placed a sign')
		
	const signBlock = bot.findBlock({
		matching: (it) => it && it.name.indexOf("sign") != -1 
	})
	
	bot.updateSign(signBlock, '[mobcoin]\n\n\n')
	
}


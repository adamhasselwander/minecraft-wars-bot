module.exports = inject

// TODO:
// Calling method responsible for timeout and bot.on('error')

function inject (bot) {
  bot.clickItemDesc = (window, desc, clickBtn = 0) => clickItemDesc(bot, window, desc, clickBtn)
  bot.craftItem = (name, amount) => craftItem(bot, name, amount)
  bot.disconnectSafely = () => disconnectSafely(bot)
}

async function clickItemDesc (bot, window, desc, clickBtn = 0) {
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

      it.displayName = hasNbtName
        ? it.nbt.value.display.value.Name.value
          .replace(/§[0-9a-flnmokr]/g, '')
        : it.displayName

      return it.displayName.length > 0
    })

  let targetBlock = blocks.filter(s => s.displayName.indexOf(desc) !== -1)[0]

  if (!targetBlock) {
    throw new Error('Could not find a block with the given description')
  }

  console.log('Clicking', targetBlock.name)

  return new Promise((resolve, reject) => {
    bot.clickWindow(targetBlock.slot, 0, clickBtn, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function craftItem (bot, name, amount) {
  await sleep(500)
  const item = require('minecraft-data')(bot.version).findItemOrBlockByName(name)
  const craftingTable = bot.findBlock({
    matching: (it) => it && it.type === 58
  })

  if (!item) throw new Error('Could not find the item')
  if (!craftingTable) throw new Error('No nerby crafting tables')

  console.log('Trying to craft ' + item.displayName +
    ' with crafting table ' + Math.floor(bot.entity.position
    .distanceTo(craftingTable.position)) + ' blocks away')

  let recipe = bot.recipesAll(item.id, null, craftingTable)[0]

  for (let i = 1; i < 10; i++) {
    if (recipe) break
    await sleep(200)
    recipe = bot.recipesAll(item.id, null, craftingTable)[0]
  }

  if (!recipe) throw new Error('Could not find a recipe')

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Crafting took too long'))
    }, 15 * 1000)

    try {
      bot.craft(recipe, amount, craftingTable, (err) => {
        if (err) reject(err)
        else {
          console.log('Crafted ' + item.displayName)
          resolve()
        }
      })
    } catch (err) {
      console.log('Could not craft ' + item.displayName)
      reject(err)
    }
  })
}

async function disconnectSafely (bot) {
  let hasEnded = false
  return new Promise((resolve, reject) => {
    try {
      bot.on('end', () => {
        try {
          bot.removeAllListeners()
          hasEnded = true
          resolve()
        } catch (err) {
          console.err('Suppressing error', err.message)
          resolve()
        }
      })
      bot.quit()
    } catch (err) {
      console.err('Suppressing error', err.message)
      resolve()
    }

    setTimeout(() => {
      try {
        if (hasEnded) return
        bot.end()
        setTimeout(() => {
          try {
            bot.removeAllListeners()
            resolve()
          } catch (err) {
            console.err('Suppressing error', err.message)
            resolve()
          }
        }, 3000) // incase end is never triggered
      } catch (err) {
        console.err('Suppressing error', err.message)
        resolve()
      }
    }, 3000)
  })
}

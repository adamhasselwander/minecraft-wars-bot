const helper = require('./helper.js')
const readline = require('readline');

module.exports = console

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
const EventEmitter = require('events');

class Screens extends EventEmitter { }

Screens.prototype.buffers = {
   log: [],
   error: [],
   warn: [],
   all: [],
}

console.screens = new Screens()

let currentScreenKey = 'all'
let currentScreenIndex = 0

const oldConsoleLog = console.log
console.log = (...msg) => {
   console.logScreen('log', ...msg)
};
console.warn = (...msg) => {
   console.logScreen('warn', ...msg)
};
console.error = (...msg) => {
   console.logScreen('error', ...msg)
};
console.logCurrent = (...msg) => {
   console.logScreen(currentScreenKey, ...msg)
};
console.logScreen = (key, ...msg) => {
   if (!console.screens.buffers[key])
      console.screens.buffers[key] = []
   
   if (console.screens.buffers[key].length > 100) {
      console.screens.buffers[key].shift()
      if (currentScreenKey == key) currentScreenIndex--
   }

   console.screens.buffers[key].push(msg)

   if (key != 'all') 
      console.screens.buffers['all'].push(msg)
};
console.changeScreen = (key) => {
   const keys = Object.keys(console.screens.buffers)
   const match = keys.filter(k => k.indexOf(key) == 0).shift()
   if (!match) return false

   currentScreenKey = match
   currentScreenIndex = 0
   console.clear()

   console.screens.emit('changed', key)
};

setInterval(() => {
   const currentScreen = console.screens.buffers[currentScreenKey]
   for (; currentScreenIndex < currentScreen.length; currentScreenIndex++) {
      const row = currentScreen[currentScreenIndex] ? currentScreen[currentScreenIndex] : []
      oldConsoleLog(...row)
   }
}, 50)

rl.on('line', onLine)

async function onLine(line) {
   const keys = Object.keys(console.screens.buffers)

   if (line == 'h' || line == 'help') {
      oldConsoleLog('Aviable screens:')
      const keysBold = keys.map(key => {
         if (key == currentScreenKey) 
            return helper.color(key, colors.Fg.Red)
         return key
      })
      oldConsoleLog(keysBold.reduce((acc, n) => acc + ' ' + n))
   } else if (line) {
      console.changeScreen(line)
   }
}



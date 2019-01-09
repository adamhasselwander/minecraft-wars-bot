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
   
   shortenBuff(key)
   shortenBuff('all')

   console.screens.buffers[key].push(msg)

   if (key != 'all') 
      console.screens.buffers['all'].push(msg)

};

countLines = (buff) => 
   buff.map(args => args
         .map(row => (row.match(/\n/g)||[]).length + 1)
         .reduce((acc, b) => acc + b, 0))
       .reduce((acc, a) => acc + a, 0)

shortenBuff = (key) => {
   if (console.screens.buffers[key].length > 0) {
      const lines = countLines(console.screens.buffers[key])

      if (lines > 300) {
         console.screens.buffers[key].shift()
         if (currentScreenKey == key) currentScreenIndex--
      }

      if (console.screens.buffers[key].length > 100) {
         console.screens.buffers[key].shift()
         if (currentScreenKey == key) currentScreenIndex--
      }
   }
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
      oldConsoleLog('Available screens:')
      const keysBold = keys.map(key => {
         if (key == currentScreenKey) 
            return helper.color(key, colors.Fg.Red)
         return key
      })
      oldConsoleLog(keysBold.reduce((acc, n) => acc + ' ' + n), 0)
   } else if (line) {
      console.changeScreen(line)
   }
}



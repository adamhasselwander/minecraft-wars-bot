require('./consolescreens.js')
const fs = require('fs')

const file = fs.readFileSync('errors.txt', 'utf8')
const json = '[' + file.slice(0, -1) + ']'
const data = JSON.parse(json)

const u = Object.entries(data
  .map(it => it.message.split('\n')[0])
  .map(it => it.substring(0, 200))
  .reduce((acc, it) => {
    acc[it] = (acc[it] || 0) + 1
    return acc
  }, {}))
  .sort((a, b) => a[1] - b[1])
  .reduce((acc, it) => {
    acc[it[0]] = it[1]
    return acc
  }, {})

const m = Object.entries(data
  .map(it => it.readableDate.slice(0, -2) + '00')
  .reduce((acc, it) => {
    acc[it] = (acc[it] || 0) + 1
    return acc
  }, {}))
  .sort((a, b) => a[1] - b[1])
  .reduce((acc, it) => {
    acc[it[0]] = it[1]
    return acc
  }, {})

const h = Object.entries(data
  .map(it => it.readableDate.slice(0, -5) + '00:00')
  .reduce((acc, it) => {
    acc[it] = (acc[it] || 0) + 1
    return acc
  }, {}))
  .sort((a, b) => a[1] - b[1])
  .reduce((acc, it) => {
    acc[it[0]] = it[1]
    return acc
  }, {})

const d = Object.entries(data
  .map(it => it.readableDate.slice(0, -8) + '00:00:00')
  .reduce((acc, it) => {
    acc[it] = (acc[it] || 0) + 1
    return acc
  }, {}))
  .sort((a, b) => a[1] - b[1])
  .reduce((acc, it) => {
    acc[it[0]] = it[1]
    return acc
  }, {})

console.logScreen('msg', data.map(it => it.message))
console.logScreen('time', data.map(it => it.readableDate))
console.logScreen('stack', data.map(it => it.stack))
console.logScreen('uniq', u)
console.logScreen('mins', m)
console.logScreen('hours', h)
console.logScreen('days', d)
console.logScreen('obj', data)

Object.entries(data
  .reduce((acc, it) => {
    (acc[it.message] = acc[it.message] || []).push(it)
    return acc
  }, {}))
  .forEach(it => {
    console.logScreen(it[0].replace(/ /g, '_'), it[1])
  })

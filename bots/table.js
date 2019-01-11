const { Buffer } = require('buffer')
const HasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty)
const {
  keys: ObjectKeys,
  values: ObjectValues
} = Object
const {
  from: ArrayFrom
} = Array
const util = require('util')

const {
  isSet, isMap, isSetIterator, isMapIterator
} = util.types

const keyKey = 'Key'
const valuesKey = 'Values'
const iterKey = '(iteration index)'

const tableChars = {
  /* eslint-disable node-core/non-ascii-character */
  middleMiddle: '─',
  rowMiddle: '┼',
  topRight: '┐',
  topLeft: '┌',
  leftMiddle: '├',
  topMiddle: '┬',
  bottomRight: '┘',
  bottomLeft: '└',
  bottomMiddle: '┴',
  rightMiddle: '┤',
  left: '│ ',
  right: ' │',
  middle: ' │ '
  /* eslint-enable node-core/non-ascii-character */
}
const colorRegExp = /\u001b\[\d\d?m/g // eslint-disable-line no-control-regex

const removeColors = (string) => {
  return string.replace(colorRegExp, '')
}

const countSymbols = (string) => {
  const sanitized = removeColors(string.toString())
  return Buffer.from(sanitized, 'UCS-2').byteLength / 2
}

const renderRow = (row, columnWidths) => {
  let out = tableChars.left
  for (var i = 0; i < row.length; i++) {
    const cell = row[i]
    const len = countSymbols(cell)
    const needed = (columnWidths[i] - len) / 2
    // round(needed) + ceil(needed) will always add up to the amount
    // of spaces we need while also left justifying the output.
    out += `${' '.repeat(needed)}${cell}${' '.repeat(Math.ceil(needed))}`
    if (i !== row.length - 1) { out += tableChars.middle }
  }
  out += tableChars.right
  return out
}

const final = (head, columns) => {
  const rows = []
  const columnWidths = head.map((h) => countSymbols(h))
  const longestColumn = columns.reduce((n, a) => Math.max(n, a.length), 0)

  for (var i = 0; i < head.length; i++) {
    const column = columns[i]
    for (var j = 0; j < longestColumn; j++) {
      if (rows[j] === undefined) { rows[j] = [] }
      const value = rows[j][i] = HasOwnProperty(column, j) ? column[j] : ''
      const width = columnWidths[i] || 0
      const counted = countSymbols(value)
      columnWidths[i] = Math.max(width, counted)
    }
  }

  const divider = columnWidths.map((i) =>
    tableChars.middleMiddle.repeat(i + 2))

  let result = `${tableChars.topLeft}${divider.join(tableChars.topMiddle)}` +
    `${tableChars.topRight}\n${renderRow(head, columnWidths)}\n` +
    `${tableChars.leftMiddle}${divider.join(tableChars.rowMiddle)}` +
    `${tableChars.rightMiddle}\n`

  for (const row of rows) { result += `${renderRow(row, columnWidths)}\n` }

  result += `${tableChars.bottomLeft}${divider.join(tableChars.bottomMiddle)}` +
    tableChars.bottomRight

  return result
}

const table = (tabularData, indexKey = '(index)') => {
  const getIndexArray = (length) => ArrayFrom({ length }, (_, i) => (i))

  const mapIter = isMapIterator(tabularData)
  let isKeyValue = false
  let i = 0
  // if (mapIter) {
  //   const res = previewEntries(tabularData, true)
  //   tabularData = res[0]
  //   isKeyValue = res[1]
  // }

  if (isKeyValue || isMap(tabularData)) {
    const keys = []
    const values = []
    let length = 0
    if (mapIter) {
      for (; i < tabularData.length / 2; ++i) {
        keys.push((tabularData[i * 2]))
        values.push((tabularData[i * 2 + 1]))
        length++
      }
    } else {
      for (const [k, v] of tabularData) {
        keys.push((k))
        values.push((v))
        length++
      }
    }
    return final([
      iterKey, keyKey, valuesKey
    ], [
      getIndexArray(length),
      keys,
      values
    ])
  }

  const setIter = isSetIterator(tabularData)
  // if (setIter) { tabularData = previewEntries(tabularData) }

  const setlike = setIter || (mapIter && !isKeyValue) || isSet(tabularData)
  if (setlike) {
    const values = []
    let length = 0
    for (const v of tabularData) {
      values.push((v))
      length++
    }
    return final([setlike ? iterKey : indexKey, valuesKey], [
      getIndexArray(length),
      values
    ])
  }

  const map = {}
  let hasPrimitives = false
  const valuesKeyArray = []
  const indexKeyArray = ObjectKeys(tabularData)

  for (let i = 0; i < indexKeyArray.length; i++) {
    const item = tabularData[indexKeyArray[i]]
    const primitive = item === null ||
      (typeof item !== 'function' && typeof item !== 'object')
    if (primitive) {
      hasPrimitives = true
      valuesKeyArray[i] = (item)
    } else {
      const keys = ObjectKeys(item)
      for (const key of keys) {
        if (map[key] === undefined) { map[key] = [] }
        map[key][i] = item == null ? '' : (item[key] == null ? '' : item[key])
      }
    }
  }

  const keys = ObjectKeys(map)
  const values = ObjectValues(map)
  if (hasPrimitives) {
    keys.push(valuesKey)
    values.push(valuesKeyArray)
  }
  keys.unshift(indexKey)
  values.unshift(indexKeyArray)

  return final(keys, values)
}

module.exports = table

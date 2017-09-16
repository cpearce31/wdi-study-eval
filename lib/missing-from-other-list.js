// jshint node: true
'use strict'

const missingFromOtherList = (list0, list1, compare) => {
  const comparator = (a, b) => {
    if (a && (!b || (b && compare(a, b) < 0))) {
      return -1
    } else if (b && (!a || (a && compare(a, b) > 0))) {
      return +1
    }

    return 0
  }

  const sorted = [null, null]
  const missing = [[], []]

  sorted[0] = list0.slice().sort(compare)
  sorted[1] = list1.slice().sort(compare)

  for (let a = 0, b = 0; a < sorted[0].length || b < sorted[1].length;) {
    const result = comparator(sorted[0][a], sorted[1][b])
    if (result < 0) {
      missing[0].push(sorted[0][a])
      a++
    } else if (result > 0) {
      missing[1].push(sorted[1][b])
      b++
    } else {
      a++
      b++
    }
  }

  return missing
}

module.exports = missingFromOtherList

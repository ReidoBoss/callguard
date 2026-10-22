const digitWords: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}
const token = `(?:${Object.keys(digitWords).join('|')}|\\d+)`
// Digits written or read aloud, split by spaces, commas or dashes: `4111 1111 …`, `four one one one, …`
const digitRun = new RegExp(`\\b${token}(?:[\\s,-]+${token})*\\b`, 'gi')

// A card's expiry read aloud after "expiring" or "expiry": `09/28`, `zero nine twenty-eight`
const numberWord = `(?:${Object.keys(digitWords).join('|')}|ten|eleven|twelve|(?:thir|four|fif|six|seven|eigh|nine)teen|(?:twen|thir|for|fif|six|seven|eigh|nine)ty|\\d+)`
const expiry = new RegExp(`\\b(expir\\w*|exp\\.?)(\\s+(?:date\\s+)?(?:is\\s+|of\\s+|on\\s+)?)${numberWord}(?:[\\s/,-]+${numberWord})*\\b`, 'gi')

/**
 * Masks a card number, any run of 13 to 19 digits, to `**** 1111`, the shape the flag quotes
 * use, and the card's expiry to `**\/**`. A longer run is a card joined to something else,
 * such as an expiry read without "expiring" (#80), so its last four aren't the card's: all masked
 */
export function maskCardNumbers(text: string) {
  return text
    .replace(digitRun, (run) => {
      const digits = run.toLowerCase().split(/[\s,-]+/).map(part => digitWords[part] ?? part).join('')
      if (digits.length > 19) return '****'
      return digits.length >= 13 ? `**** ${digits.slice(-4)}` : run
    })
    .replace(expiry, '$1$2**/**')
}

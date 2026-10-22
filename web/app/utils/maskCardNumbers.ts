const digitWords: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}
const token = `(?:${Object.keys(digitWords).join('|')}|\\d+)`
// Digits written or read aloud, split by spaces, commas or dashes: `4111 1111 …`, `four one one one, …`
const digitRun = new RegExp(`\\b${token}(?:[\\s,-]+${token})*\\b`, 'gi')

/** Masks a card number, any run of 13 or more digits, to `**** 1111`, the shape the flag quotes use */
export function maskCardNumbers(text: string) {
  return text.replace(digitRun, (run) => {
    const digits = run.toLowerCase().split(/[\s,-]+/).map(part => digitWords[part] ?? part).join('')
    return digits.length >= 13 ? `**** ${digits.slice(-4)}` : run
  })
}

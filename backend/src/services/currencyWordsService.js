/**
/**
 * Currency to Words Conversion Service
 * High-precision converter for Indian Rupees (Lakhs/Crores) and US Dollars (Thousands/Millions).
 * Zero-safe, decimal-safe, and financial rounding compliant.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(num) {
  if (num < 20) return ONES[num];
  const tens = TENS[Math.floor(num / 10)];
  const ones = ONES[num % 10];
  return ones ? `${tens}-${ones}` : tens;
}

function convertThreeDigits(num) {
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const hStr = hundreds ? `${ONES[hundreds]} Hundred` : '';
  const rStr = remainder ? convertTwoDigits(remainder) : '';
  if (hStr && rStr) return `${hStr} ${rStr}`;
  return hStr || rStr;
}

/**
 * Converts an amount to Indian Currency Words (Lakhs & Crores)
 * e.g. 28225.50 -> "Rupees Twenty-Eight Thousand Two Hundred Twenty-Five and Fifty Paise Only"
 */
export function amountToWordsINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '';
  if (Math.abs(num) < 0.001) return 'Rupees Zero Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundredsPart = rupees % 1000;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredsPart > 0) {
    words += `${convertThreeDigits(hundredsPart)} `;
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only';

  return isNegative ? `Minus ${result}` : result;
}

/**
 * Converts an amount to US Dollars (Thousands & Millions)
 * e.g. 1540.75 -> "One Thousand Five Hundred Forty Dollars and Seventy-Five Cents Only"
 */
export function amountToWordsUSD(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '';
  if (Math.abs(num) < 0.001) return 'Zero Dollars Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const dollars = Math.floor(absNum);
  const cents = Math.round((absNum - dollars) * 100);

  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let chunks = [];
  let temp = dollars;

  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let wordsArr = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkStr = convertThreeDigits(chunk);
      const scaleStr = scales[i];
      wordsArr.push(scaleStr ? `${chunkStr} ${scaleStr}` : chunkStr);
    }
  }

  let words = wordsArr.join(' ').trim();
  if (!words) words = 'Zero';

  let result = `${words} Dollar${dollars === 1 ? '' : 's'}`;
  if (cents > 0) {
    result += ` and ${convertTwoDigits(cents)} Cent${cents === 1 ? '' : 's'}`;
  }
  result += ' Only';

  return isNegative ? `Minus ${result}` : result;
}

/**
 * Generic Currency to Words Dispatcher
 */
export function getAmountInWords(amount, currency = 'INR') {
  const curr = String(currency || 'INR').toUpperCase().trim();
  if (curr === 'INR') {
    return amountToWordsINR(amount);
  }
  if (curr === 'USD') {
    return amountToWordsUSD(amount);
  }
  // Generic fallback: format as numeric amount with currency code
  const num = Number(amount) || 0;
  return `${curr} ${num.toFixed(2)}`;
}

// MARCMaker Specifications : https://www.loc.gov/marc/makrbrkr.html#what-is-marc

export {
  mrkToObject,
  tokenizer,
  syntaxAnalyzer,
  toHimarc,
  toHTML
};

/**
 * The mrkToObject function takes the raw marc21 text, tokenize it, parse it and transform it into a javascript object
 * @param {string} data raw marc21 text
 * @returns {Object}
 */
function mrkToObject (data) {
  const result = syntaxAnalyzer(tokenizer(data));
  result.data = toHimarc(result);
  return result;
}

/**
 * The tokenizer function takes the raw marc21 text and splits it apart into tokens. Tokens are an array of tiny little
 * objects that describe an isolated piece of the syntax.
 * @param {string} input raw marc21 text
 * @returns {Array}
 */
function tokenizer (input) {
  const WHITESPACE = /\s/;
  const EOL = /\n/;
  const START_FIELD = /=/;
  const SUBFIELD_CODE_DELIMITER = /\$/;

  const tokens = [];
  let position = 0;
  while (position < input.length) {
    let char = input[position];

    if (START_FIELD.test(char)) {
      tokens.push({ type: 'startField', value: char, startPosition: position });
      char = input[++position];
      let value = '';
      const startPosition = position;
      while (!(WHITESPACE.test(char) || EOL.test(char) || position >= input.length)) {
        value += char;
        char = input[++position];
      }
      tokens.push({ type: 'data', value: value.trim(), startPosition });
      continue;
    }

    if (EOL.test(char)) {
      tokens.push({ type: 'eol', value: char, startPosition: position });
      char = input[++position];
      continue;
    }

    if (WHITESPACE.test(char)) {
      tokens.push({ type: 'whitespace', value: char, startPosition: position });
      char = input[++position];
      continue;
    }

    if (SUBFIELD_CODE_DELIMITER.test(char)) {
      tokens.push({ type: 'subFieldCodeDelimiter', value: char, startPosition: position });
      char = input[++position];
      continue;
    }

    let value = '';
    const startPosition = position;
    while (!(START_FIELD.test(char) || EOL.test(char) || SUBFIELD_CODE_DELIMITER.test(char) || position > (input.length - 1))) {
      value += char;
      char = input[++position];
    }
    tokens.push({ type: 'data', value: value, startPosition });
  }

  return tokens;
}

/**
 * The syntaxAnalyzer function takes the tokens and reformats them into a representation that describes each part of the
 * syntax and their relation to one another.
 * @param {Array} tokens tokens from the tokenizer function
 * @returns {Array}
 */
function syntaxAnalyzer (tokens) {
  const errors = [];

  const data = tokens.map((token, index) => {
    if (token.type !== 'data') return token;

    const previousToken = getPreviousToken(tokens, index) || { type: null };
    const nextToken = getNextToken(tokens, index) || { type: null };

    if (previousToken.type === 'startField') {
      token.type = 'tag';
      const TAG = /^([0-9]{3}|LDR)$/;
      if (!TAG.test(token.value)) {
        token.message = 'tag field is invalid';
        errors.push(token);
      }
      return token;
    }

    if (previousToken.type === 'tag' && (previousToken.value.startsWith('00') || previousToken.value === 'LDR')) {
      token.type = 'controlFieldInfo';
      return token;
    }

    if (previousToken.type === 'tag' && nextToken.type === 'subFieldCodeDelimiter') {
      token.type = 'indicators';
      const INDICATOR = /^[0-9\\]{2}$/;
      if (!INDICATOR.test(token.value)) {
        token.message = 'Indicators must have two characters in every variable data field';
        errors.push(token);
      }
      return token;
    }

    if (previousToken.type === 'subFieldCodeDelimiter') {
      const subFieldCode = {
        type: 'subFieldCode',
        value: token.value[0],
        startPosition: token.startPosition
      };
      const ALPHANUMERIC = /[a-z0-9]/;
      if (!ALPHANUMERIC.test(subFieldCode.value)) subFieldCode.message = 'subField code must be a lowercase alphabetic or numeric character';

      const subFieldInfo = { type: 'subFieldInfo', startPosition: token.startPosition + 1 };
      if (token.value.length > 1) {
        subFieldInfo.value = token.value.slice(1);
      } else {
        subFieldInfo.value = '';
        subFieldInfo.message = 'data element is empty';
      }

      token.type = 'dataFieldInfo';
      token.value = [subFieldCode, subFieldInfo];
      if ('error' in subFieldCode || 'error' in subFieldInfo) {
        errors.push(token);
      }
      return token;
    }

    token.type = 'unknown';
    errors.push(token);
    return token;
  });

  return { data, errors };
}

/**
 * The toHimarc transform function takes the the tokens after the syntax analysis step and builds a representation of the Marc21
 * data into a javascript object
 * @param {Object} result Object fromt the syntaxAnalyzer function
 * @returns {Object}
 */
function toHimarc (result) {
  return result.data.map((token, index) => (token.type === 'startField') ? index : null)
    .filter(indice => indice !== null)
    .reduce((accumulator, currentValue, index, arr) => {
      if (index + 2 <= arr.length) accumulator.push(arr.slice(index, index + 2));
      if (index === (arr.length - 1)) accumulator.push([currentValue, result.data.length]);
      return accumulator;
    }, [])
    .map(fieldIndice => {
      return result.data.slice(...fieldIndice);
    })
    .map(fieldsInfo => {
      return fieldsInfo.reduce((accumulator, current) => {
        if (current.type === 'tag') accumulator[current.type] = current.value;

        if (current.type === 'controlFieldInfo') accumulator.value = current.value;

        if (current.type === 'indicators') {
          accumulator.indicator1 = current.value.charAt(0);
          accumulator.indicator2 = current.value.charAt(1);
        }

        if (current.type === 'dataFieldInfo') {
          const subField = current.value.reduce((accumulator, current) => {
            accumulator[current.type] = current.value;
            return accumulator;
          }, {});
          if (!('subFields' in accumulator)) accumulator.subFields = [];
          accumulator.subFields.push({ [subField.subFieldCode]: subField.subFieldInfo.trim() });
        }

        return accumulator;
      }, {});
    })
    .map(field => {
      if (field.tag === 'LDR') {
        field.value = formatLeader(field.value);
      }

      if (field.tag === '007') {
        field.value = field.value.split('')
          .reduce((accumulator, currentValue, index) => {
            accumulator.positions[String(index).padStart(2, '0')] = currentValue;
            return accumulator;
          }, { positions: {} });
      }

      return field;
    })
    .reduce((accumulator, current) => {
      if ('value' in current) {
        accumulator[current.tag] = current.value;
      } else {
        const currentWhithoutKeyTag = Object.keys(current).reduce((acc, key) => {
          if (key !== 'tag') acc[key] = current[key];
          return acc;
        }, {});
        if (current.tag in accumulator) {
          if (!Array.isArray(accumulator[current.tag])) accumulator[current.tag] = [accumulator[current.tag]];
          accumulator[current.tag] = [...accumulator[current.tag], currentWhithoutKeyTag];
        } else {
          accumulator[current.tag] = currentWhithoutKeyTag;
        }
      }
      return accumulator;
    }, {});
}

function toHTML (parsedContent) {
  return parsedContent.reduce((accumulator, current) => {
    if (['whitespace', 'eol'].includes(current.type)) {
      accumulator += current.value;
      return accumulator;
    }
    if (Array.isArray(current.value)) {
      const value = current.value.map(item => {
        if (item.type === 'subFieldCode') {
          return `<span class="${item.type}">${item.value}</span>`;
        } else {
          return item.value;
        }
      }).join('');
      accumulator += value;
      return accumulator;
    }
    accumulator += `<span class="${current.type}">${current.value}</span>`;
    return accumulator;
  }, '');
}

function formatLeader (leader) {
  return {
    positions: {
      '00-04': leader.slice(0, 5),
      '05': leader.charAt(5),
      '06': leader.charAt(6),
      '07': leader.charAt(7),
      '08': leader.charAt(8),
      '09': leader.charAt(9),
      10: leader.charAt(10),
      11: leader.charAt(11),
      '12-16': leader.slice(12, 17),
      17: leader.charAt(17),
      18: leader.charAt(18),
      19: leader.charAt(19),
      20: leader.charAt(20),
      21: leader.charAt(21),
      22: leader.charAt(22)
    }
  };
}

function getNextToken (arr, index) {
  if (index < (arr.length - 1)) {
    if (['whitespace', 'eol'].includes(arr[index + 1].type)) {
      return getNextToken(arr, index + 1);
    } else {
      return arr[index + 1];
    }
  } else {
    return null;
  }
}

function getPreviousToken (arr, index) {
  if (index >= 1) {
    if (['whitespace', 'eol'].includes(arr[index - 1].type)) {
      return getPreviousToken(arr, index - 1);
    } else {
      return arr[index - 1];
    }
  } else {
    return null;
  }
}

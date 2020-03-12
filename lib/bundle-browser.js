var mrkToObject = (function (exports) {
  'use strict';

  // MARCMaker Specifications : https://www.loc.gov/marc/makrbrkr.html#what-is-marc

  function mrkToObject (data) {
    const result = syntaxAnalyzer(tokenizer(data));
    result.data = transform(result);
    return transform(syntaxAnalyzer(tokenizer(data)));
  }

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

      if (WHITESPACE.test(char) || EOL.test(char)) {
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
      tokens.push({ type: 'data', value: value.trim(), startPosition });
    }

    return tokens;
  }

  function syntaxAnalyzer (tokens) {
    const errors = [];

    const betterTokens = tokens.map((token, index) => {
      if (token.type !== 'data') return token;

      const previousToken = (index >= 1) ? tokens[index - 1] : { type: null };
      const nextToken = (index < (tokens.length - 1)) ? tokens[index + 1] : { type: null };

      if (previousToken.type === 'startField') {
        token.type = 'tag';
        const TAG = /^([0-9]{3}|LDR)$/;
        if (!TAG.test(token.value)) {
          token.error = 'tag field is invalid';
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
          token.error = 'Indicators must have two characters in every variable data field';
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
        if (!ALPHANUMERIC.test(subFieldCode.value)) subFieldCode.error = 'subField code must be a lowercase alphabetic or numeric character';

        const subFieldInfo = { type: 'subFieldInfo', startPosition: token.startPosition + 1 };
        if (token.value.length > 1) {
          subFieldInfo.value = token.value.slice(1);
        } else {
          subFieldInfo.error = 'data element is empty';
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

    const data = betterTokens.map((token, index) => (token.type === 'startField') ? index : null)
      .filter(indice => indice !== null)
      .reduce((accumulator, currentValue, index, arr) => {
        if (index + 2 <= arr.length) accumulator.push(arr.slice(index, index + 2));
        if (index === (arr.length - 1)) accumulator.push([currentValue, betterTokens.length]);
        return accumulator;
      }, [])
      .map(fieldIndice => {
        return betterTokens.slice(...fieldIndice);
      })
      ;

    return { data, errors };
  }

  function transform (result) {
    return result.data.map(fieldsInfo => {
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
    }).map(field => {
      if (field.tag === 'LDR') field.value = formatLeader(field.value);

      if (field.tag === '007') {
        field.value = field.value.split('')
          .reduce((accumulator, currentValue, index) => {
            accumulator.positions[String(index).padStart(2, '0')] = currentValue;
            return accumulator;
          }, { positions: {} });
      }

      return field;
    }).reduce((accumulator, current) => {
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

  exports.mrkToObject = mrkToObject;
  exports.syntaxAnalyzer = syntaxAnalyzer;
  exports.tokenizer = tokenizer;
  exports.transform = transform;

  return exports;

}({}));

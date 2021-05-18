// MARCMaker Specifications : https://www.loc.gov/marc/makrbrkr.html#what-is-marc

const allJsonSchema = require('json-schema-himarc');

module.exports = {
  mrcToObject,
  mrkToObject,
  tokenizer,
  syntaxAnalyzer,
  toHimarc,
  toHTML
};

/**
 * The mrcToObject function takes the marc21 format, tokenize it, parse it and transform it into a javascript object
 * @param {string} data marc21 format
 * @param {array} filterTag filter data only for input tag
 * @returns {Object}
 */
function mrcToObject (data, filterTag = []) {
  const tokens = data.split(String.fromCharCode(0x1E));
  const leader = getLeaderFrom(tokens);
  const directory = getDirectoryFrom(tokens);
  const directoryEntries = getDirectoryEntriesFrom(directory);
  const variableFields = getVariableFieldsFrom(tokens);
  const fields = directoryEntries
    .map((entry, index) => {
      const variableField = variableFields[index];
      return { entry, variableField };
    })
    .filter(({ entry, variableField }) => filterTag.length === 0 || filterTag.includes(entry.tag))
    .map(({ entry, variableField }) => {
      const field = {};
      if (entry.tag.startsWith('00')) {
        field[entry.tag] = variableField;
      } else {
        const fieldTag = field[entry.tag] = {};
        const dataFieldTokens = variableField.split(String.fromCharCode(0x1F));
        fieldTag.indicator1 = getIndicator1From(dataFieldTokens);
        fieldTag.indicator2 = getIndicator2From(dataFieldTokens);
        fieldTag.subFields = getSubFieldFrom(dataFieldTokens);
      }
      return field;
    })
    .reduce((previous, current) => {
      const tag = Object.keys(current)[0];
      if (isFieldRepeatable(tag)) {
        if (!(tag in previous)) previous[tag] = [];
        previous[tag].push(current[tag]);
        return previous;
      } else {
        return Object.assign(previous, current);
      }
    }, {});
  if (filterTag.length === 0 || filterTag.includes('LDR')) fields.LDR = leader;
  if ((filterTag.length === 0 || filterTag.includes('007')) && '007' in fields) {
    fields['007'] = fields['007'].map(value => formatField007(value));
  }
  if (filterTag.length === 0 || filterTag.includes('008')) {
    const fields008 = fields['008'] || '';
    fields['008'] = formatField008(fields008, leader.positions['06'], leader.positions['07']);
  }
  return fields;
}

/**
 * The mrkToObject function takes the raw marc21 text, tokenize it, parse it and transform it into a javascript object
 * @param {string} data raw marc21 text
 * @returns {Object}
 */
function mrkToObject (data) {
  const result = toHimarc(syntaxAnalyzer(tokenizer(data)));
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
    let beforeChar = input[position - 1];

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

    if (SUBFIELD_CODE_DELIMITER.test(char) && beforeChar !== '/') {
      tokens.push({ type: 'subFieldCodeDelimiter', value: char, startPosition: position });
      char = input[++position];
      continue;
    }

    let value = '';
    const startPosition = position;
    while (
      !EOL.test(char) &&
      !(SUBFIELD_CODE_DELIMITER.test(char) && beforeChar !== '/') &&
      !(position > (input.length - 1))
    ) {
      value += char;
      char = input[++position];
      beforeChar = input[position - 1];
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

    if (previousToken.type === 'tag') {
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
 * @param {Object} result Object from the syntaxAnalyzer function
 * @returns {Object}
 */
function toHimarc (result) {
  const errors = result.errors || [];
  const cache = [];
  const fields = result.data.map((token, index) => (token.type === 'startField') ? index : null)
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
      if (!('subFields' in field) && !field.tag.startsWith('00')) field.subFields = [];
      if (field.tag === 'LDR') field.value = formatLeader(field.value);
      if (field.tag === '007') field.value = formatField007(field.value);
      return field;
    })
    .map((field, index, arr) => {
      if (field.tag === '008') {
        const leader = arr.filter(item => item.tag === 'LDR');
        if (leader.length > 0) {
          const leaderValue = leader[0].value;
          field.value = formatField008(field.value, leaderValue.positions['06'], leaderValue.positions['07']);
        } else {
          errors.push({
            type: 'field',
            message: 'the leader is missing for the transformation of field 008'
          });
        }
      }
      return field;
    })
    .reduce((accumulator, current) => {
      const value = ('value' in current)
        ? current.value
        : Object.keys(current).reduce((acc, key) => {
          if (key !== 'tag') acc[key] = current[key];
          return acc;
        }, {});

      if (isFieldRepeatable(current.tag)) {
        if (current.tag in accumulator) {
          accumulator[current.tag].push(value);
        } else {
          accumulator[current.tag] = [value];
        }
      } else {
        if (cache.includes(current.tag)) {
          errors.push({
            type: 'field',
            tag: current.tag,
            message: "field is repeated when it shouldn't"
          });
        } else {
          cache.push(current.tag);
        }
        accumulator[current.tag] = value;
      }
      return accumulator;
    }, {});
  return { fields, errors };
}

/**
 * The toHTML transform function takes the the tokens after the syntax analysis step and builds a representation of the Marc21
 * data into HTML
 * @param {Object} result Object from the syntaxAnalyzer function
 * @returns {Object}
 */
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

function formatField007 (value) {
  let fieldInfos;
  const categoryOfMaterial = value.split('')[0];
  const initFieldInfos = (data, size) => {
    return data.padStart(size).split('').map((value, index) => ({
      position: String(index).padStart(2, '0'),
      value
    }));
  };
  const isMaps = (categoryOfMaterial) => categoryOfMaterial === 'a';
  if (isMaps(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 8);
  }
  const isElectronicResource = (categoryOfMaterial) => categoryOfMaterial === 'c';
  if (isElectronicResource(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 14);
    spliceAndSetData(fieldInfos, 6, 9, value);
  }
  const isGlobe = (categoryOfMaterial) => categoryOfMaterial === 'd';
  if (isGlobe(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 6);
  }
  const isTactileMaterial = (categoryOfMaterial) => categoryOfMaterial === 'f';
  if (isTactileMaterial(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 10);
    spliceAndSetData(fieldInfos, 6, 9, value);
    spliceAndSetData(fieldInfos, 3, 5, value);
  }
  const isProjectedGraphic = (categoryOfMaterial) => categoryOfMaterial === 'g';
  if (isProjectedGraphic(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 9);
  }
  const isMicroForm = (categoryOfMaterial) => categoryOfMaterial === 'h';
  if (isMicroForm(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 13);
    spliceAndSetData(fieldInfos, 6, 9, value);
  }
  const isNonprojectedGraphic = (categoryOfMaterial) => categoryOfMaterial === 'k';
  if (isNonprojectedGraphic(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 6);
  }
  const isMotionPicture = (categoryOfMaterial) => categoryOfMaterial === 'm';
  if (isMotionPicture(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 23);
    spliceAndSetData(fieldInfos, 17, 23, value);
  }
  const isKit = (categoryOfMaterial) => categoryOfMaterial === 'o';
  const isNotatedMusic = (categoryOfMaterial) => categoryOfMaterial === 'q';
  const isText = (categoryOfMaterial) => categoryOfMaterial === 't';
  const isUnspecified = (categoryOfMaterial) => categoryOfMaterial === 'z';
  if (isKit(categoryOfMaterial) || isNotatedMusic(categoryOfMaterial) || isText(categoryOfMaterial) || isUnspecified(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 2);
  }
  const isRemoteSensingImage = (categoryOfMaterial) => categoryOfMaterial === 'r';
  if (isRemoteSensingImage(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 11);
    spliceAndSetData(fieldInfos, 9, 11, value);
  }
  const isSoundRecording = (categoryOfMaterial) => categoryOfMaterial === 's';
  if (isSoundRecording(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 14);
  }
  const isVideoRecording = (categoryOfMaterial) => categoryOfMaterial === 'v';
  if (isVideoRecording(categoryOfMaterial)) {
    fieldInfos = initFieldInfos(value, 9);
  }

  return fieldInfos.reduce((accumulator, current) => {
    accumulator.positions[current.position] = current.value;
    return accumulator;
  }, { positions: {} });
}

function formatField008 (value, typeOfRecord, bibliographicLevel) {
  const fieldInfos = value.padStart(40).split('').map((value, index) => ({
    position: String(index).padStart(2, '0'),
    value
  }));
  spliceAndSetData(fieldInfos, 35, 38, value);
  const isBooks = (typeOfRecord === 'a' && ['a', 'c', 'd', 'm'].includes(bibliographicLevel)) || typeOfRecord === 't';
  if (isBooks) {
    spliceAndSetData(fieldInfos, 24, 28, value);
    spliceAndSetData(fieldInfos, 18, 22, value);
  }
  const isComputerFields = typeOfRecord === 'm';
  if (isComputerFields) {
    spliceAndSetData(fieldInfos, 29, 35, value);
    spliceAndSetData(fieldInfos, 24, 26, value);
    spliceAndSetData(fieldInfos, 18, 22, value);
  }
  const isMaps = ['e', 'f'].includes(typeOfRecord);
  if (isMaps) {
    spliceAndSetData(fieldInfos, 33, 35, value);
    spliceAndSetData(fieldInfos, 26, 28, value);
    spliceAndSetData(fieldInfos, 22, 24, value);
    spliceAndSetData(fieldInfos, 18, 22, value);
  }
  const isMusic = ['c', 'd', 'i', 'j'].includes(typeOfRecord);
  if (isMusic) {
    spliceAndSetData(fieldInfos, 30, 32, value);
    spliceAndSetData(fieldInfos, 24, 30, value);
    spliceAndSetData(fieldInfos, 18, 20, value);
  }
  const isContinuingResources = typeOfRecord === 'a' && ['b', 'i', 's'].includes(bibliographicLevel);
  if (isContinuingResources) {
    spliceAndSetData(fieldInfos, 30, 33, value);
  }
  const isVisualMaterials = ['g', 'k', 'o', 'r'].includes(typeOfRecord);
  if (isVisualMaterials) {
    spliceAndSetData(fieldInfos, 30, 33, value);
    spliceAndSetData(fieldInfos, 23, 27, value);
    spliceAndSetData(fieldInfos, 18, 20, value);
  }
  const isMixedMaterials = typeOfRecord === 'p';
  if (isMixedMaterials) {
    spliceAndSetData(fieldInfos, 24, 35, value);
    spliceAndSetData(fieldInfos, 18, 23, value);
  }
  spliceAndSetData(fieldInfos, 15, 18, value);
  spliceAndSetData(fieldInfos, 11, 15, value);
  spliceAndSetData(fieldInfos, 7, 11, value);
  spliceAndSetData(fieldInfos, 0, 6, value);
  return fieldInfos.reduce((accumulator, current) => {
    accumulator.positions[current.position] = current.value;
    return accumulator;
  }, { positions: {} });
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

function spliceAndSetData (arr, start, end, data) {
  arr.splice(start, (end - start), {
    position: `${String(start).padStart(2, '0')}-${String(end - 1).padStart(2, '0')}`,
    value: data.substring(start, end)
  });
}

function isFieldRepeatable (tag) {
  const repeatableTag = Object.keys(allJsonSchema.register.fields.properties).filter(field => {
    return allJsonSchema.register.fields[field].isRepeatable;
  });
  return repeatableTag.includes(tag);
}

function getLeaderFrom (tokens) {
  const leader = tokens[0].slice(0, 24);
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

function getDirectoryFrom (tokens) {
  return tokens[0].slice(24);
}

function getDirectoryEntriesFrom (directory) {
  return directory.match(/(.{1,12})/g)
    .map(entry => {
      return {
        tag: entry.slice(0, 3),
        lengthOfField: entry.slice(3, 7),
        startingCharacterPosition: entry.slice(7, 12)
      };
    });
}

function getVariableFieldsFrom (tokens) {
  return tokens.slice(1);
}

function getIndicator1From (dataFieldTokens) {
  return dataFieldTokens[0][0] === ' ' ? '\\' : dataFieldTokens[0][0];
}

function getIndicator2From (dataFieldTokens) {
  return dataFieldTokens[0][1] === ' ' ? '\\' : dataFieldTokens[0][1];
}

function getSubFieldFrom (dataFieldTokens) {
  return dataFieldTokens.slice(1)
    .map(subfield => {
      return {
        [subfield[0]]: subfield.slice(1).trim()
      };
    });
}

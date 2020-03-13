[![Build Status](https://travis-ci.org/CIEPS/hiMarc.svg?branch=master)](https://travis-ci.org/CIEPS/hiMarc)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

# himarc
Another marc21 analyzer in text format

## Install

```sh
npm install himarc
```

## Usage
```js
const { mrkToObject } = require('himarc');

const recordMrk = `
=LDR  02105cas a2200541 a 4500
=001  0028-0836
=007  ta
=008  190816c18699999enkwr|p       0   a0eng  
=035  \\\\$a(ISSN)00280836
=044  \\\\$cGBR
=264  31$aLondon$bSpringer Nature Limited
=336  \\\\$atext$2rdacontent
=337  \\\\$aunmediated$2rdamedia
=510  \\\\$aCABABSTRACTS$9facet
=510  \\\\$aCROSSREF$9facet
`;

console.log(mrkToObject(recordMrk));
```
Ouput :

```json
{
  data: {
    '264': {
      indicator1: '3',
      indicator2: '1',
      subFields: [ { a: 'London' }, { b: 'Springer Nature Limited' } ]
    },
    '336': {
      indicator1: '\\',
      indicator2: '\\',
      subFields: [ { a: 'text' }, { '2': 'rdacontent' } ]
    },
    '337': {
      indicator1: '\\',
      indicator2: '\\',
      subFields: [ { a: 'unmediated' }, { '2': 'rdamedia' } ]
    },
    '510': [
      {
        indicator1: '\\',
        indicator2: '\\',
        subFields: [ { a: 'CABABSTRACTS' }, { '9': 'facet' } ]
      },
      {
        indicator1: '\\',
        indicator2: '\\',
        subFields: [ { a: 'CROSSREF' }, { '9': 'facet' } ]
      }
    ],
    LDR: {
      positions: {
        '10': '2',
        '11': '2',
        '17': ' ',
        '18': 'a',
        '19': ' ',
        '20': '4',
        '21': '5',
        '22': '0',
        '00-04': '02105',
        '05': 'c',
        '06': 'a',
        '07': 's',
        '08': ' ',
        '09': 'a',
        '12-16': '00541'
      }
    },
    '001': '0028-0836',
    '007': { positions: { '00': 't', '01': 'a' } },
    '008': '190816c18699999enkwr|p       0   a0eng',
    '035': {
      indicator1: '\\',
      indicator2: '\\',
      subFields: [ { a: '(ISSN)00280836' } ]
    },
    '044': { indicator1: '\\', indicator2: '\\', subFields: [ { c: 'GBR' } ] }
  },
  errors: []
}
```

[![Build Status](https://travis-ci.org/CIEPS/hiMarc.svg?branch=master)](https://travis-ci.org/CIEPS/hiMarc)
![npm](https://img.shields.io/npm/v/himarc)
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

console.dir(mrkToObject(recordMrk), { depth: 8 });
```
Or 

```js
const { mrcToObject } = require('himarc');

const recordMrc = '00640cas a2200205 a 4500001001000000003000500010005001700015007001500032008004100047035001900088039012800107044000800235264003600243336002100279337002500300338004000325510002400365510002000389ABC0025004090028-0836ISSN20190817162300.0cu gn 008apabp190816c18699999enkwr|p       0   a0eng    a(ISSN)00280836 9a201908171623bVLOADc201908171559dVLOADc201908161254dICBIBc201905041728dVLOADy200406091632zloadwGBR_20190816.mrcx3  cGBR31aLondonbSpringer Nature Limited  atext2rdacontent  aunmediated2rdamedia  avolume2rdacarrier  aCABABSTRACTS9facet  aCROSSREF9facet123aLoremBIpsumcDolor';

console.dir(mrcToObject(recordMrc), { depth: 8 });
```

Ouput :

```js
{
  fields: {
    '264': [
      {
        indicator1: '3',
        indicator2: '1',
        subFields: [ { a: 'London' }, { b: 'Springer Nature Limited' } ]
      }
    ],
    '336': [
      {
        indicator1: '\\',
        indicator2: '\\',
        subFields: [ { a: 'text' }, { '2': 'rdacontent' } ]
      }
    ],
    '337': [
      {
        indicator1: '\\',
        indicator2: '\\',
        subFields: [ { a: 'unmediated' }, { '2': 'rdamedia' } ]
      }
    ],
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
    '007': [ { positions: { '00': 't', '01': 'a' } } ],
    '008': {
      positions: {
        '18': 'w',
        '19': 'r',
        '20': '|',
        '21': 'p',
        '22': ' ',
        '23': ' ',
        '24': ' ',
        '25': ' ',
        '26': ' ',
        '27': ' ',
        '28': ' ',
        '29': '0',
        '33': 'a',
        '34': '0',
        '38': ' ',
        '39': ' ',
        '00-05': '190816',
        '06': 'c',
        '07-10': '1869',
        '11-14': '9999',
        '15-17': 'enk',
        '30-32': '   ',
        '35-37': 'eng'
      }
    },
    '035': [
      {
        indicator1: '\\',
        indicator2: '\\',
        subFields: [ { a: '(ISSN)00280836' } ]
      }
    ],
    '044': { indicator1: '\\', indicator2: '\\', subFields: [ { c: 'GBR' } ] }
  },
  errors: []
}
```
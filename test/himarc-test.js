/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const mrkRecord = fs.readFileSync(path.join(__dirname, './data/nature.mrk'), 'utf8');
const mrcRecord = fs.readFileSync(path.join(__dirname, './data/nature.mrc'), 'utf8');
const { mrcToObject, tokenizer, syntaxAnalyzer, toHimarc } = require('../src/himarc.js');

describe('hiMarc', function () {
  describe('tokenizer()', function () {
    it('should return a array of token from a marc21 record (ISO 2709)', function () {
      const tokens = tokenizer(mrkRecord);
      expect(tokens).to.be.an('array');
      tokens.map(token => {
        expect(token).to.be.an('object');
        expect(token).to.have.property('type');
        expect(token.type).to.be.a('string');
        expect(token).to.have.property('value');
        expect(token.value).to.be.a('string');
        expect(token).to.have.property('startPosition');
        expect(token.startPosition).to.be.a('number');
      });
    });
  });

  describe('syntaxAnalyzer()', function () {
    it('should return a object improved by parsing', function () {
      const result = syntaxAnalyzer(tokenizer(mrkRecord));
      expect(result).to.be.an('object');
      expect(result).to.have.property('data');
      expect(result.data).to.be.an('array');
      result.data.map(fieldInfo => {
        expect(fieldInfo).to.be.an('object');
        expect(fieldInfo).to.have.property('type');
        expect(fieldInfo.type).to.be.a('string');
        expect(fieldInfo).to.have.property('value');
        if (fieldInfo.type === 'dataFieldInfo') {
          expect(fieldInfo.value).to.be.a('array');
          fieldInfo.value.map(fieldInfo => {
            expect(fieldInfo).to.be.an('object');
            expect(fieldInfo).to.have.property('type');
            expect(fieldInfo.type).to.be.a('string');
            expect(fieldInfo).to.have.property('value');
            expect(fieldInfo.value).to.be.a('string');
            expect(fieldInfo).to.have.property('startPosition');
            expect(fieldInfo.startPosition).to.be.a('number');
          });
        } else {
          expect(fieldInfo.value).to.be.a('string');
        }
        expect(fieldInfo).to.have.property('startPosition');
        expect(fieldInfo.startPosition).to.be.a('number');
      });
      expect(result).to.have.property('errors');
      expect(result.errors).to.be.an('array');
      result.errors.map(error => {
        expect(error).to.be.an('object');
        expect(error).to.have.property('type');
        expect(error.type).to.be.a('string');
        expect(error).to.have.property('value');
        if (error.type === 'dataFieldInfo') {
          expect(error.value).to.be.a('array');
          error.value.map(error => {
            expect(error).to.be.an('object');
            expect(error).to.have.property('type');
            expect(error.type).to.be.a('string');
            expect(error).to.have.property('value');
            expect(error.value).to.be.a('string');
            expect(error).to.have.property('startPosition');
            expect(error.startPosition).to.be.a('number');
          });
        } else {
          expect(error.value).to.be.a('string');
        }
        expect(error).to.have.property('startPosition');
        expect(error.startPosition).to.be.a('number');
      });
    });
  });

  describe('toHimarc()', function () {
    it('should return an record Object JS next the parsing step', function () {
      const result = toHimarc(syntaxAnalyzer(tokenizer(mrkRecord)));
      const expectedResult = {
        264: [
          {
            indicator1: '3',
            indicator2: '1',
            subFields: [{ a: 'London' }, { b: 'Springer Nature Limited' }]
          }
        ],
        336: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'text' }, { 2: 'rdacontent' }]
          }
        ],
        337: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'unmediated' }, { 2: 'rdamedia' }]
          }
        ],
        338: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'volume' }, { 2: 'rdacarrier' }]
          }
        ],
        510: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'CABABSTRACTS' }, { 9: 'facet' }]
          },
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'CROSSREF' }, { 9: 'facet' }]
          }
        ],
        LDR: {
          positions: {
            10: '2',
            11: '2',
            17: ' ',
            18: 'a',
            19: ' ',
            20: '4',
            21: '5',
            22: '0',
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
        '003': 'ISSN',
        '005': '20190817162300.0',
        '007': [{
          positions: {
            10: 'p',
            11: 'a',
            12: 'b',
            13: 'p',
            '00': 'c',
            '01': 'u',
            '02': ' ',
            '03': 'g',
            '04': 'n',
            '05': ' ',
            '06-08': '008',
            '09': 'a'
          }
        }],
        '008': {
          positions: {
            18: 'w',
            19: 'r',
            20: '|',
            21: 'p',
            22: ' ',
            23: ' ',
            24: ' ',
            28: ' ',
            29: '0',
            33: 'a',
            34: '0',
            38: ' ',
            39: ' ',
            '00-05': '190816',
            '06': 'c',
            '07-10': '1869',
            '11-14': '9999',
            '15-17': 'enk',
            '25-27': '   ',
            '30-32': '   ',
            '35-37': 'eng'
          }
        },
        '035': [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: '(ISSN)00280836' }]
          }
        ],
        '039': [
          {
            indicator1: '\\',
            indicator2: '9',
            subFields: [
              { a: '201908171623' },
              { b: 'VLOAD' },
              { c: '201908171559' },
              { d: 'VLOAD' },
              { c: '201908161254' },
              { d: 'ICBIB' },
              { c: '201905041728' },
              { d: 'VLOAD' },
              { y: '200406091632' },
              { z: 'load' },
              { w: 'GBR_20190816.mrc' },
              { x: '3' }
            ]
          }
        ],
        '044': { indicator1: '\\', indicator2: '\\', subFields: [{ c: 'GBR' }] },
        ABC: [
          {
            indicator1: '1',
            indicator2: '2',
            subFields: [{ a: 'Lorem' }, { B: 'Ipsum' }, { c: 'Dolor' }]
          }
        ]
      };
      expect(result.fields).to.be.deep.equal(expectedResult);
    });
  });

  describe('mrcToObject()', function () {
    it('should return an record Object JS', function () {
      const result = mrcToObject(mrcRecord);
      const expectedResult = {
        264: [
          {
            indicator1: '3',
            indicator2: '1',
            subFields: [{ a: 'London' }, { b: 'Springer Nature Limited' }]
          }
        ],
        336: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'text' }, { 2: 'rdacontent' }]
          }
        ],
        337: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'unmediated' }, { 2: 'rdamedia' }]
          }
        ],
        338: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'volume' }, { 2: 'rdacarrier' }]
          }
        ],
        510: [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'CABABSTRACTS' }, { 9: 'facet' }]
          },
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: 'CROSSREF' }, { 9: 'facet' }]
          }
        ],
        LDR: {
          positions: {
            10: '2',
            11: '2',
            17: ' ',
            18: 'a',
            19: ' ',
            20: '4',
            21: '5',
            22: '0',
            '00-04': '00640',
            '05': 'c',
            '06': 'a',
            '07': 's',
            '08': ' ',
            '09': 'a',
            '12-16': '00205'
          }
        },
        '001': '0028-0836',
        '003': 'ISSN',
        '005': '20190817162300.0',
        '007': [{
          positions: {
            10: 'p',
            11: 'a',
            12: 'b',
            13: 'p',
            '00': 'c',
            '01': 'u',
            '02': ' ',
            '03': 'g',
            '04': 'n',
            '05': ' ',
            '06-08': '008',
            '09': 'a'
          }
        }],
        '008': {
          positions: {
            18: 'w',
            19: 'r',
            20: '|',
            21: 'p',
            22: ' ',
            23: ' ',
            24: ' ',
            28: ' ',
            29: '0',
            33: 'a',
            34: '0',
            38: ' ',
            39: ' ',
            '00-05': '190816',
            '06': 'c',
            '07-10': '1869',
            '11-14': '9999',
            '15-17': 'enk',
            '25-27': '   ',
            '30-32': '   ',
            '35-37': 'eng'
          }
        },
        '035': [
          {
            indicator1: '\\',
            indicator2: '\\',
            subFields: [{ a: '(ISSN)00280836' }]
          }
        ],
        '039': [
          {
            indicator1: '\\',
            indicator2: '9',
            subFields: [
              { a: '201908171623' },
              { b: 'VLOAD' },
              { c: '201908171559' },
              { d: 'VLOAD' },
              { c: '201908161254' },
              { d: 'ICBIB' },
              { c: '201905041728' },
              { d: 'VLOAD' },
              { y: '200406091632' },
              { z: 'load' },
              { w: 'GBR_20190816.mrc' },
              { x: '3' }
            ]
          }
        ],
        '044': { indicator1: '\\', indicator2: '\\', subFields: [{ c: 'GBR' }] },
        ABC: [
          {
            indicator1: '1',
            indicator2: '2',
            subFields: [{ a: 'Lorem' }, { B: 'Ipsum' }, { c: 'Dolor' }]
          }
        ]
      };
      expect(result).to.be.deep.equal(expectedResult);
    });
  });
});

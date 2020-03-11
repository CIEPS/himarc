/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const mrkRecord = fs.readFileSync(path.join(__dirname, './data/nature.mrk'), 'utf8');
const { tokenizer, syntaxAnalyzer, transform } = require('../lib/bundle-node.js');

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
        expect(fieldInfo).to.be.an('array');
        fieldInfo.map(item => {
          expect(item).to.be.an('object');
          expect(item).to.have.property('type');
          expect(item.type).to.be.a('string');
          expect(item).to.have.property('value');
          if (item.type === 'dataFieldInfo') {
            expect(item.value).to.be.a('array');
            item.value.map(item => {
              expect(item).to.be.an('object');
              expect(item).to.have.property('type');
              expect(item.type).to.be.a('string');
              expect(item).to.have.property('value');
              expect(item.value).to.be.a('string');
              expect(item).to.have.property('startPosition');
              expect(item.startPosition).to.be.a('number');
            });
          } else {
            expect(item.value).to.be.a('string');
          }
          expect(item).to.have.property('startPosition');
          expect(item.startPosition).to.be.a('number');
        });
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

  describe('transform()', function () {
    it('should return an record Object JS next the parsing step', function () {
      const result = transform(syntaxAnalyzer(tokenizer(mrkRecord)));
      expect(result).to.be.an('object');
      Object.keys(result).map(key => {
        const fieldInfo = result[key];
        if (key.startsWith('00') || key === 'LDR') {
          expect(fieldInfo).to.be.a('string');
        } else {
          if (key === '510') {
            fieldInfo.map(subFieldInfo => {
              expect(subFieldInfo).to.be.an('object');
              expect(subFieldInfo).to.have.property('indicator1');
              expect(subFieldInfo.indicator1).to.have.lengthOf(1);
              expect(subFieldInfo).to.have.property('indicator2');
              expect(subFieldInfo.indicator2).to.have.lengthOf(1);
              expect(subFieldInfo).to.have.property('subFields');
            });
          } else {
            expect(fieldInfo).to.be.an('object');
            expect(fieldInfo).to.have.property('indicator1');
            expect(fieldInfo.indicator1).to.have.lengthOf(1);
            expect(fieldInfo).to.have.property('indicator2');
            expect(fieldInfo.indicator2).to.have.lengthOf(1);
            expect(fieldInfo).to.have.property('subFields');
          }
        }
      });
    });
  });
});

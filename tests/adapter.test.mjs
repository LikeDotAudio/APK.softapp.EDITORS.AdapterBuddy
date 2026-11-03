import test from 'node:test';
import assert from 'node:assert/strict';
import { AdapterModel } from '../js/adapterApp.js';

test('AdapterModel manages input/output conversion formats and pin mappings', () => {
  const ad = new AdapterModel('XLR-TRS', 'XLR-F-3PIN', '1/4-TRS');
  assert.equal(ad.name, 'XLR-TRS');
  assert.equal(ad.inFormat, 'XLR-F-3PIN');
  assert.equal(ad.outFormat, '1/4-TRS');

  ad.setFormats('Dante-AES67', 'Analog-Line');
  assert.equal(ad.inFormat, 'Dante-AES67');
  assert.equal(ad.outFormat, 'Analog-Line');
});

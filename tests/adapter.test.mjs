import test from 'node:test';
import assert from 'node:assert/strict';
import { AdapterModel } from '../js/adapterModel.js';

test('AdapterModel manages input/output conversion formats and pin mappings', () => {
  const ad = new AdapterModel('XLR-TRS', 'XLR-F-3PIN', '1/4-TRS');
  assert.equal(ad.name, 'XLR-TRS');
  assert.equal(ad.inFormat, 'XLR-F-3PIN');
  assert.equal(ad.outFormat, '1/4-TRS');

  ad.setFormats('Dante-AES67', 'Analog-Line');
  assert.equal(ad.inFormat, 'Dante-AES67');
  assert.equal(ad.outFormat, 'Analog-Line');
});

test('AdapterModel exports and imports block schemas correctly', () => {
  const ad = new AdapterModel('DANTE-AVIO', 'RJ45-Dante', 'XLR-M-Analog');
  ad.addPinMapping({ fromPin: 'Eth Rx+', toPin: 'Pin 2 Hot', status: 'DAC', signal: 'Analog Audio' });
  
  const block = ad.toBlock();
  assert.equal(block.type, 'adapter');
  assert.equal(block.name, 'DANTE-AVIO');
  assert.equal(block.pinMap.length, 5);

  const restored = new AdapterModel();
  restored.fromBlock(block);
  assert.equal(restored.name, 'DANTE-AVIO');
  assert.equal(restored.inFormat, 'RJ45-Dante');
  assert.equal(restored.outFormat, 'XLR-M-Analog');
  assert.equal(restored.pinMap.length, 5);
});

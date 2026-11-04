// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export class AdapterModel {
  constructor(name = 'HDMI-SDI-BALUN', inFormat = 'HDMI 2.0', outFormat = '12G-SDI') {
    this.name = name;
    this.partNumber = 'ADP-H2S-12G';
    this.category = 'Media Converter';
    this.passiveOrActive = 'Active';
    this.inFormat = inFormat;
    this.outFormat = outFormat;
    this.attenuationDb = 0;
    this.pinMap = [
      { fromPin: 'TMDS Data0+', toPin: 'SDI Channel 1', status: 'Mapped', signal: 'Video' },
      { fromPin: 'TMDS Data1+', toPin: 'SDI Channel 2', status: 'Mapped', signal: 'Video' },
      { fromPin: 'TMDS Clock', toPin: 'SDI Clock Sync', status: 'Mapped', signal: 'Clock' },
      { fromPin: 'DDC/CEC', toPin: 'N/C', status: 'Ignored', signal: 'Control' }
    ];
  }

  setFormats(inFormat, outFormat) {
    this.inFormat = inFormat;
    this.outFormat = outFormat;
  }

  addPinMapping(mapping = {}) {
    const pin = {
      fromPin: mapping.fromPin || `Pin ${this.pinMap.length + 1}`,
      toPin: mapping.toPin || `Pin ${this.pinMap.length + 1}`,
      status: mapping.status || 'Mapped',
      signal: mapping.signal || 'Audio/Video'
    };
    this.pinMap.push(pin);
    return pin;
  }

  removePinMapping(index) {
    if (index >= 0 && index < this.pinMap.length) {
      return this.pinMap.splice(index, 1)[0];
    }
    return null;
  }

  updatePinMapping(index, key, value) {
    if (this.pinMap[index]) {
      this.pinMap[index][key] = value;
    }
  }

  toBlock() {
    return {
      type: 'adapter',
      id: `adapter_${this.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: this.name,
      partNumber: this.partNumber,
      category: this.category,
      passiveOrActive: this.passiveOrActive,
      inFormat: this.inFormat,
      outFormat: this.outFormat,
      attenuationDb: this.attenuationDb,
      pinMap: JSON.parse(JSON.stringify(this.pinMap))
    };
  }

  fromBlock(block = {}) {
    if (block.name) this.name = block.name;
    if (block.partNumber) this.partNumber = block.partNumber;
    if (block.category) this.category = block.category;
    if (block.passiveOrActive) this.passiveOrActive = block.passiveOrActive;
    if (block.inFormat) this.inFormat = block.inFormat;
    if (block.outFormat) this.outFormat = block.outFormat;
    if (block.attenuationDb !== undefined) this.attenuationDb = block.attenuationDb;
    if (Array.isArray(block.pinMap)) {
      this.pinMap = JSON.parse(JSON.stringify(block.pinMap));
    }
  }
}

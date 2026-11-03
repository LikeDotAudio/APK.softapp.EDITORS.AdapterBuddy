// Part of the APK.audio project — Anthony Kuzub
// MIT Licence.

export class AdapterModel {
  constructor(name = 'HDMI-SDI-BALUN', inFormat = 'HDMI 2.0', outFormat = '12G-SDI') {
    this.name = name;
    this.inFormat = inFormat;
    this.outFormat = outFormat;
    this.pinMap = [
      { fromPin: 'TMDS Data0+', toPin: 'SDI Channel 1', status: 'Mapped' },
      { fromPin: 'TMDS Data1+', toPin: 'SDI Channel 2', status: 'Mapped' },
      { fromPin: 'TMDS Clock', toPin: 'SDI Clock Sync', status: 'Mapped' },
      { fromPin: 'DDC/CEC', toPin: 'N/C', status: 'Ignored' }
    ];
  }

  setFormats(inFormat, outFormat) {
    this.inFormat = inFormat;
    this.outFormat = outFormat;
  }
}

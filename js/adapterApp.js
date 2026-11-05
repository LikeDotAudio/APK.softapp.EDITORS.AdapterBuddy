// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { AdapterModel } from './adapterModel.js';
import { connectAdapterHost, saveMeta, interfaceFamilies } from './adapterHost.js';

export { AdapterModel };

const FIELDS = ['name', 'partNumber', 'category', 'passiveOrActive', 'inFormat', 'outFormat', 'attenuationDb'];
const PIN_STATUS = ['Mapped', 'Inverted', 'Resistor-Drop', 'Ignored', 'Ground'];

export class AdapterApp {
  constructor(S) {
    this.S = S;
    this.esc = S.esc;
    this.model = new AdapterModel();
    this.svgContainer = document.getElementById('adapter-svg');
    this.statusEl = document.getElementById('interfaces-status');

    this.table = window.APKTable.create(document.getElementById('pins-table'), {
      id: 'adapterbuddy-pins',
      columns: [
        { key: 'fromPin', label: 'From Pin / Connector A' },
        { key: 'toPin', label: 'To Pin / Connector B' },
        { key: 'signal', label: 'Signal Type' },
        { key: 'status', label: 'Translation Status', type: 'select', options: PIN_STATUS },
      ],
      rows: this.model.pinMap,
      onEdit: (i, key, value) => {
        this.model.updatePinMapping(i, key, value);
        this.renderSvg();
        this.changed();
      },
      onDelete: (i) => {
        this.model.removePinMapping(i);
        this.render();
        this.changed();
      },
      empty: 'No pin mappings yet. Add one above.',
    });

    S.describe({
      name: 'Adapter Buddy',
      does: 'Draws one adapter (connector A to connector B) and its pin-by-pin translation map, as an adapter block for the CAD.',
      inputs: [
        { name: 'Adapter block', from: 'the CAD (when opened from a drawing), or a .json file via Open Block', kind: 'file' },
        { name: 'Interface Map', from: 'the bus: retained Gui/Interfaces/Map/Interfaces panel (format suggestions only)', kind: 'bus' },
      ],
      outputs: [
        { name: 'Adapter block', to: 'the CAD on Save & Return and live on every edit; outside the CAD Save downloads adapter_<name>.json', kind: 'file' },
      ],
      controls: [
        { name: 'Open Block', how: 'pick an adapter block .json to edit' },
        { name: 'Save & Return', how: 'send the block to the CAD (or download it standalone)' },
        { name: 'Name / Part / Category / Active / In / Out / Attenuation', how: 'type or pick; the drawing updates as you type' },
        { name: '+ Add Pin Mapping', how: 'adds a pin row; edit From / To / Signal / Status in the table, delete with its row button' },
        { name: 'Close (x)', how: 'closes the editor inside the CAD' },
      ],
      problems: ['bad_json', 'bad_input', 'file_unreadable', 'not_in_cad', 'bus_missing'],
    });
    this.host = connectAdapterHost(S, this.model, { onLoaded: () => this.render() });
    S.inheritTheme();
    this.initControls();
    this.render();
    this.readInterfaces();
  }

  changed() { this.host.changed(this.model.toBlock(), saveMeta(this.model)); }

  /* Format suggestions come from the contract's Interfaces table (the Interface Map), never a list of our own. */
  async readInterfaces() {
    const list = document.getElementById('format-choices');
    const t = await this.S.interfaces({
      onChange: (rows) => {
        if (!list) return;
        list.replaceChildren(...interfaceFamilies(rows).map((f) => {
          const o = document.createElement('option');
          o.value = f;
          return o;
        }));
        if (this.statusEl) this.statusEl.textContent = `Format suggestions: ${rows.length} interfaces in the Interface Map.`;
      },
    });
    if (!this.statusEl) return;
    if (!t.ok) this.statusEl.textContent = t.reason;
    else if (!t.rows().length) this.statusEl.textContent = 'Waiting for the Interface Map on the bus (nothing retained yet, or no broker).';
  }

  initControls() {
    document.getElementById('btn-save')?.addEventListener('click', () => {
      this.host.save(this.model.toBlock(), saveMeta(this.model));
    });

    const open = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onerror = () => this.S.showProblem('file_unreadable', {
          subject: file.name, detail: reader.error && reader.error.message, onRetry: open,
        });
        reader.onload = (evt) => {
          try {
            this.model.fromBlock(JSON.parse(evt.target.result));
            this.render();
            this.changed();
          } catch (err) {
            this.S.showProblem(err instanceof SyntaxError ? 'bad_json' : 'bad_input', {
              subject: file.name,
              detail: err.message,
              fix: ['Open an adapter block .json saved by Adapter Buddy (Save & Return outside the CAD downloads one).'],
              onRetry: open,
            });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
    document.getElementById('btn-open')?.addEventListener('click', open);

    document.getElementById('btn-close')?.addEventListener('click', () => this.host.close());

    document.getElementById('btn-add-pin')?.addEventListener('click', () => {
      this.model.addPinMapping({ fromPin: 'In Pin', toPin: 'Out Pin', status: 'Mapped', signal: 'Analog' });
      this.render();
      this.changed();
    });

    FIELDS.forEach((field) => {
      document.getElementById(`prop-${field}`)?.addEventListener('input', (e) => {
        this.model[field] = e.target.value;
        this.renderForm(false);
        this.renderSvg();
        this.changed();
      });
    });
  }

  render() {
    this.renderForm(true);
    this.table.setRows(this.model.pinMap);
    this.renderSvg();
  }

  renderForm(values) {
    if (values) {
      FIELDS.forEach((field) => {
        const el = document.getElementById(`prop-${field}`);
        if (el && this.model[field] !== undefined) el.value = this.model[field];
      });
    }
    const titleEl = document.getElementById('display-adapter-title');
    if (titleEl) titleEl.textContent = `${this.model.name} (${this.model.inFormat} → ${this.model.outFormat})`;
  }

  renderSvg() {
    if (!this.svgContainer) return;
    const e = this.esc;
    const width = 640;
    const pinCount = Math.max(this.model.pinMap.length, 1);
    const rowHeight = 36;
    const headerHeight = 70;
    const height = Math.max(260, headerHeight + pinCount * rowHeight + 40);

    const inX = 140;
    const outX = 500;
    const midX = 320;

    let pinsSvg = '';
    this.model.pinMap.forEach((pin, i) => {
      const y = headerHeight + i * rowHeight + 20;
      const isIgnored = pin.status === 'Ignored';
      const strokeColor = isIgnored ? '#4A5B73' : (pin.status === 'Inverted' ? '#F4902C' : '#4A9EFF');
      const strokeDash = isIgnored ? 'stroke-dasharray="4 4"' : '';

      pinsSvg += `
        <circle cx="${inX}" cy="${y}" r="5" fill="#18181b" stroke="${strokeColor}" stroke-width="2"/>
        <text x="${inX - 12}" y="${y + 4}" fill="#f4f4f5" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="end">${e(pin.fromPin)}</text>
        <path d="M ${inX + 5} ${y} C ${midX - 40} ${y}, ${midX + 40} ${y}, ${outX - 5} ${y}" fill="none" stroke="${strokeColor}" stroke-width="2" ${strokeDash}/>
        <rect x="${midX - 35}" y="${y - 9}" width="70" height="18" rx="3" fill="#121212" stroke="${strokeColor}" stroke-width="1"/>
        <text x="${midX}" y="${y + 4}" fill="#888888" font-size="9" font-family="sans-serif" text-anchor="middle">${e(pin.signal || 'Signal')}</text>
        <circle cx="${outX}" cy="${y}" r="5" fill="#18181b" stroke="${strokeColor}" stroke-width="2"/>
        <text x="${outX + 12}" y="${y + 4}" fill="#f4f4f5" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">${e(pin.toPin)}</text>
      `;
    });

    this.svgContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chassisGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#2c2c2c"/>
            <stop offset="100%" stop-color="#18181b"/>
          </linearGradient>
        </defs>
        <rect x="70" y="15" width="500" height="${height - 30}" rx="10" fill="url(#chassisGrad)" stroke="#2B3C5D" stroke-width="2"/>
        <rect x="70" y="15" width="500" height="42" rx="10" fill="#0f0f11" stroke="#2B3C5D" stroke-width="1"/>
        <text x="90" y="42" fill="#F4902C" font-size="14" font-weight="bold" font-family="JetBrains Mono, monospace">${e(this.model.name)}</text>
        <text x="320" y="42" fill="#888888" font-size="11" font-family="sans-serif" text-anchor="middle">${e(this.model.category)} • ${e(this.model.passiveOrActive)}</text>
        <text x="550" y="42" fill="#4A9EFF" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="end">${e(this.model.partNumber)}</text>
        <rect x="80" y="65" width="110" height="${height - 90}" rx="6" fill="#121212" stroke="#2B3C5D" stroke-width="1"/>
        <text x="135" y="82" fill="#4A9EFF" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${e(this.model.inFormat)}</text>
        <rect x="450" y="65" width="110" height="${height - 90}" rx="6" fill="#121212" stroke="#2B3C5D" stroke-width="1"/>
        <text x="505" y="82" fill="#4A9EFF" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${e(this.model.outFormat)}</text>
        ${pinsSvg}
      </svg>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.APKSoftapp || !window.APKTable) {
      document.body.prepend(Object.assign(document.createElement('p'), {
        textContent: 'vendor/apk-softapp or vendor/apk-table did not load: this editor cannot start.',
      }));
      return;
    }
    window.adapterApp = new AdapterApp(window.APKSoftapp);
  });
}

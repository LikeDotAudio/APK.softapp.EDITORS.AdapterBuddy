// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { AdapterModel } from './adapterModel.js';
import { BlockBridge } from './blockBridge.js';

export { AdapterModel };

export class AdapterApp {
  constructor() {
    this.model = new AdapterModel();
    this.bridge = new BlockBridge({
      name: 'Adapter Buddy',
      type: 'adapter',
      onBlockLoaded: (b, m) => this.handleBlockLoaded(b, m),
      onBlockChanged: () => this.render()
    });

    this.tableBody = document.getElementById('pins-table-body');
    this.svgContainer = document.getElementById('adapter-svg');
    this.initControls();
    this.render();
    this.autoConnect();
  }

  async autoConnect() {
    const discovered = await this.bridge.fetchDiscoveredProject();
    if (discovered && discovered.adapters && discovered.adapters.length > 0) {
      this.model.fromBlock(discovered.adapters[0]);
      this.render();
    }
  }

  handleBlockLoaded(block, meta) {
    if (block) {
      this.model.fromBlock(block);
      this.render();
    }
  }

  initControls() {
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.bridge.saveBlock(this.model.toBlock(), { name: this.model.name });
      });
    }

    const btnOpen = document.getElementById('btn-open');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target.result);
              this.model.fromBlock(data);
              this.render();
            } catch (err) {
              alert('Invalid block file: ' + err.message);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    const btnClose = document.getElementById('btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.bridge.close());
    }

    const btnDiscovered = document.getElementById('btn-discovered');
    if (btnDiscovered) {
      btnDiscovered.addEventListener('click', async () => {
        const disc = await this.bridge.fetchDiscoveredProject();
        if (disc && disc.adapters && disc.adapters.length > 0) {
          this.model.fromBlock(disc.adapters[0]);
          this.render();
        } else {
          alert('No adapter blocks found in current discovered project.');
        }
      });
    }

    const btnAddPin = document.getElementById('btn-add-pin');
    if (btnAddPin) {
      btnAddPin.addEventListener('click', () => {
        this.model.addPinMapping({ fromPin: 'In Pin', toPin: 'Out Pin', status: 'Mapped', signal: 'Analog' });
        this.render();
        this.bridge.notifyChanged();
      });
    }

    // Property inputs
    ['name', 'partNumber', 'category', 'passiveOrActive', 'inFormat', 'outFormat', 'attenuationDb'].forEach(field => {
      const el = document.getElementById(`prop-${field}`);
      if (el) {
        el.addEventListener('input', (e) => {
          this.model[field] = e.target.value;
          this.renderSvg();
          this.bridge.notifyChanged();
        });
      }
    });
  }

  render() {
    this.renderForm();
    this.renderTable();
    this.renderSvg();
  }

  renderForm() {
    ['name', 'partNumber', 'category', 'passiveOrActive', 'inFormat', 'outFormat', 'attenuationDb'].forEach(field => {
      const el = document.getElementById(`prop-${field}`);
      if (el && this.model[field] !== undefined) {
        el.value = this.model[field];
      }
    });

    const titleEl = document.getElementById('display-adapter-title');
    if (titleEl) {
      titleEl.textContent = `${this.model.name} (${this.model.inFormat} → ${this.model.outFormat})`;
    }
  }

  renderTable() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    this.model.pinMap.forEach((pin, idx) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="inline-cell" contenteditable="true" data-idx="${idx}" data-field="fromPin">${pin.fromPin || ''}</td>
        <td class="inline-cell" contenteditable="true" data-idx="${idx}" data-field="toPin">${pin.toPin || ''}</td>
        <td class="inline-cell" contenteditable="true" data-idx="${idx}" data-field="signal">${pin.signal || 'Audio/Video'}</td>
        <td>
          <select class="control-select" data-idx="${idx}" data-field="status">
            <option value="Mapped" ${pin.status === 'Mapped' ? 'selected' : ''}>Mapped</option>
            <option value="Inverted" ${pin.status === 'Inverted' ? 'selected' : ''}>Inverted</option>
            <option value="Resistor-Drop" ${pin.status === 'Resistor-Drop' ? 'selected' : ''}>Resistor-Drop</option>
            <option value="Ignored" ${pin.status === 'Ignored' ? 'selected' : ''}>Ignored / N/C</option>
            <option value="Ground" ${pin.status === 'Ground' ? 'selected' : ''}>Ground / Shield</option>
          </select>
        </td>
        <td style="text-align: center;">
          <button class="btn-delete" data-idx="${idx}" title="Delete Mapping">✕</button>
        </td>
      `;

      this.tableBody.appendChild(tr);
    });

    // Wire inline edits
    this.tableBody.querySelectorAll('[contenteditable=true]').forEach(cell => {
      cell.addEventListener('blur', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        this.model.updatePinMapping(idx, field, e.target.innerText.trim());
        this.renderSvg();
        this.bridge.notifyChanged();
      });
    });

    this.tableBody.querySelectorAll('select.control-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        this.model.updatePinMapping(idx, field, e.target.value);
        this.renderSvg();
        this.bridge.notifyChanged();
      });
    });

    this.tableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.model.removePinMapping(idx);
        this.render();
        this.bridge.notifyChanged();
      });
    });
  }

  renderSvg() {
    if (!this.svgContainer) return;

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
        <!-- Input Terminal -->
        <circle cx="${inX}" cy="${y}" r="5" fill="#121A2F" stroke="${strokeColor}" stroke-width="2"/>
        <text x="${inX - 12}" y="${y + 4}" fill="#F0F4F8" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="end">${pin.fromPin}</text>

        <!-- Route Path -->
        <path d="M ${inX + 5} ${y} C ${midX - 40} ${y}, ${midX + 40} ${y}, ${outX - 5} ${y}" fill="none" stroke="${strokeColor}" stroke-width="2" ${strokeDash}/>

        <!-- Signal Indicator badge -->
        <rect x="${midX - 35}" y="${y - 9}" width="70" height="18" rx="3" fill="#080C16" stroke="${strokeColor}" stroke-width="1"/>
        <text x="${midX}" y="${y + 4}" fill="#8B9BB4" font-size="9" font-family="sans-serif" text-anchor="middle">${pin.signal || 'Signal'}</text>

        <!-- Output Terminal -->
        <circle cx="${outX}" cy="${y}" r="5" fill="#121A2F" stroke="${strokeColor}" stroke-width="2"/>
        <text x="${outX + 12}" y="${y + 4}" fill="#F0F4F8" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">${pin.toPin}</text>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chassisGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#121A2F"/>
            <stop offset="50%" stop-color="#1E2A45"/>
            <stop offset="100%" stop-color="#121A2F"/>
          </linearGradient>
        </defs>

        <!-- Adapter Body Enclosure -->
        <rect x="70" y="15" width="500" height="${height - 30}" rx="10" fill="url(#chassisGrad)" stroke="#2B3C5D" stroke-width="2"/>

        <!-- Header Bar -->
        <rect x="70" y="15" width="500" height="42" rx="10" fill="#0E1424" stroke="#2B3C5D" stroke-width="1"/>
        <text x="90" y="42" fill="#F4902C" font-size="14" font-weight="bold" font-family="JetBrains Mono, monospace">${this.model.name}</text>
        <text x="320" y="42" fill="#8B9BB4" font-size="11" font-family="sans-serif" text-anchor="middle">${this.model.category} • ${this.model.passiveOrActive}</text>
        <text x="550" y="42" fill="#4A9EFF" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="end">${this.model.partNumber}</text>

        <!-- Left Connector Frame -->
        <rect x="80" y="65" width="110" height="${height - 90}" rx="6" fill="#080C16" stroke="#2B3C5D" stroke-width="1"/>
        <text x="135" y="82" fill="#4A9EFF" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${this.model.inFormat}</text>

        <!-- Right Connector Frame -->
        <rect x="450" y="65" width="110" height="${height - 90}" rx="6" fill="#080C16" stroke="#2B3C5D" stroke-width="1"/>
        <text x="505" y="82" fill="#4A9EFF" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle">${this.model.outFormat}</text>

        <!-- Pins and routing -->
        ${pinsSvg}
      </svg>
    `;

    this.svgContainer.innerHTML = svg;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new AdapterApp();
  });
}

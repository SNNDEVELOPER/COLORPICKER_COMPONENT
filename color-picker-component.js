export class ColorPickerComponent extends HTMLElement {

  /**
   * Create a new instance of the component.
   *
   * @return {void}
   */
  constructor() {
    super();

    this.state = {
      title: this.getAttribute("title") || "Color",
      width: parseInt(this.getAttribute("width")) || 300,
      height: parseInt(this.getAttribute("height")) || 150,
      selectedColor: this.getAttribute("selectedcolor"),
      isMouseDown: false,
      loupe: { x: 150, y: 75, size: 14 },
      hue: 0,
      draggingHue: false,
      huebarHeight: 25,
      huebarLoupeSize: 12
    };

    this.onColorChangeCallback = null;
  }
 
  /**
   * Define observed attributes and custom properties.
   * @type {array}
   */
  static get observedAttributes() {
    return ["title", "width", "height", "selectedcolor", "advanced"];
  }

  /**
   * Handle the component being added to the DOM.
   *
   * @return {void}
   */
  connectedCallback() {
    this.renderMarkup();
    this.cacheElements();
    this.attachEventListeners();
    this.renderHueBar();
    this.renderCanvasWithHue(this.state.hue);

    // NO SELECTED COLOR PROVIDED
    if (this.state.selectedColor) {
      this.updateSelectedColor(this.state.selectedColor);
    } else {
      this.initializeDefaultColorFromCanvas();
    }

    this.dispatchEvent(new CustomEvent("ready", {
      bubbles: true,
      composed: true
    }));
  }
 

  /**
   * Initialize the default color from the loupe position on the canvas.
   *
   * @return {void}
   */
  initializeDefaultColorFromCanvas() {
    const [r, g, b] = this.getColorAt(this.state.loupe.x, this.state.loupe.y);
    this.updateColorFields(r, g, b);
    this.syncHueWithRgb(r, g, b);
    this.fireColorChange({ r, g, b });
  }

  /**
   * Function to handle component cleanup on disposal.
   *
   * @return {void}
   */
  disconnectedCallback() {
    this.detachEventListeners();
  }

  /**
   * Setter for color change.
   *
   * @return {void}
   */
  set onColorChange(callback) {
    this.onColorChangeCallback = callback;
  }

  /**
   * Function to render component markup
   *
   * @return {void}
   */
  renderMarkup() {
    this.innerHTML = `
      <style> 
        /* COLOR PICKER STYLESHEET */
        .color-picker-component { font-family: Arial, sans-serif; font-size: 1rem; color: black; }
        .color-picker-component canvas { display: block; cursor: crosshair; }
        .color-picker-component .color-properties { display: flex; justify-content: space-between; width: ${this.state.width}px; padding-top: 0.5em; } 
        .color-picker-component .flex { display: flex;}
        .color-picker-component .flex-row { flex-flow: row; }
        .color-picker-component .flex-column { flex-flow: column; }
        .color-picker-component #hue-bar { width: ${this.state.width}px; height: ${this.state.huebarHeight}px; cursor: pointer; margin-bottom: 8px; position: relative; }
        .color-picker-component #preview-box { width: 100%; height: 50px; margin-top: 4px; border: none; } 
      </style>
      <!-- COLOR PICKER MARKUP -->
      <div class="color-picker-component">
        <p>${this.state.title}</p>
        <canvas id="hue-bar"></canvas>
        <canvas id="canvas" width="${this.state.width}" height="${this.state.height}"></canvas>
         <div class="color-properties">
         <div class="flex-column">
            <div>
              <label>RGB: <input type="number" id="r" min="0" max="255"> <input type="number" id="g" min="0" max="255"> <input type="number" id="b" min="0" max="255"></label>
            </div>
            <div>
              <label>HEX: <input type="text" id="hex"></label>
            </div>
          </div>
          <div>
              <label>Preview:</label>
              <div id="preview-box"></div>
            </div>
          </div>
      </div>
    `;
  }

  /**
   * Function to cache component elements values.
   *
   * @return {void}
   */
  cacheElements() {
    this.canvas = this.querySelector("#canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.rgbInputs = ["r", "g", "b"].map(id => this.querySelector(`#${id}`));
    this.hexInput = this.querySelector("#hex");
    this.hueBar = this.querySelector("#hue-bar");
    this.hueCtx = this.hueBar.getContext("2d");
    this.hueBar.width = this.state.width;
    this.hueBar.height = this.state.huebarHeight; 
  }

  /**
   * Function to attach component event listeners.
   *
   * @return {void}
   */
  attachEventListeners() {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);

    this.hueBar.addEventListener("mousedown", this.onHueMouseDown);
    this.hueBar.addEventListener("mousemove", this.onHueMouseMove);
    document.addEventListener("mouseup", this.onHueMouseUp);

    this.rgbInputs.forEach(input => input.addEventListener("change", () => this.handleRgbInput()));
    this.hexInput.addEventListener("change", () => this.handleHexInput());
  }

  /**
   * Function to detatch component event listeners.
   *
   * @return {void}
   */
  detachEventListeners() {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    this.hueBar.removeEventListener("mousedown", this.onHueMouseDown);
    this.hueBar.removeEventListener("mousemove", this.onHueMouseMove);
    document.removeEventListener("mouseup", this.onHueMouseUp);
  }

  /**
   * Mouse down event.
   *
   * @param {Event} e Event.
   * @return {void}
   */
  onMouseDown = (e) => {
    this.state.isMouseDown = true;
    this.updateLoupeFromEvent(e, true);
  }

  /**
   * Mouse move event.
   *
   * @param {Event} e Event.
   * @return {void}
   */
  onMouseMove = (e) => {
    if (!this.state.isMouseDown) return;
    this.updateLoupeFromEvent(e, false);
  }

  /**
   * Mouse up event.
   *
   * @return {void}
   */
  onMouseUp = () => {
    this.state.isMouseDown = false;
  }

  /**
   * Hue Mouse down event.
   *
   * @param {Event} e Event.
   * @return {void}
   */
  onHueMouseDown = (e) => {
    this.state.draggingHue = true;
    this.updateHueFromEvent(e);
  }

  /**
   * Hue Mouse move event.
   *
   * @param {Event} e Event.
   * @return {void}
   */
  onHueMouseMove = (e) => {
    if (!this.state.draggingHue) return;
    this.updateHueFromEvent(e);
  }

  /**
   * Hue Mouse up event.
   *
   * @return {void}
   */
  onHueMouseUp = () => {
    this.state.draggingHue = false;
  }


  /**
   * Update Hue from event.
   *
   * @param {Event} e Event.
   * @return {void}
   */
  updateHueFromEvent(e) {
    const rect = this.hueBar.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
    const hue = Math.round((x / this.hueBar.width) * 360);
    this.state.hue = hue;
    this.renderHueBar();
    this.renderCanvasWithHue(hue);

    // UPDATE COLOR FROM CURRENT LOUPE POSITION 
    const [r, g, b] = this.getColorAt(this.state.loupe.x, this.state.loupe.y);
    this.updateColorFields(r, g, b);
    this.fireColorChange({ r, g, b });
  }

  /**
   * Function to update loupe position from event.
   *
   * @param {Event} e Event.
   * @param {boolean} allowHueSync Boolean value for allowHueSync.
   * @return {void}
   */
  updateLoupeFromEvent(e, allowHueSync = false) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(this.canvas.width - 1, e.clientX - rect.left));
    const y = Math.max(0, Math.min(this.canvas.height - 1, e.clientY - rect.top));

    // SNAP TO BOUNDS
    if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) return;

    this.state.loupe.x = x;
    this.state.loupe.y = y;
    this.renderCanvasWithHue(this.state.hue);
    const [r, g, b] = this.getColorAt(x, y);
    this.updateColorFields(r, g, b);

    // SYNC HUE ONLY ON INITIAL CLICK, NOT CONTINUOUS DRAG 
    if (allowHueSync) this.syncHueWithRgb(r, g, b);

    this.fireColorChange({ r, g, b });
  }

  /**
   * Function to get color at coordinates.
   *
   * @param {number} x A number for X coordinate.
   * @param {number} y A number for Y coordinate.
   * @return {array} An array of RGB values.
   */
  getColorAt(x, y) {
    const data = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return [data[0], data[1], data[2]];
  }

  /**
   * Function to handle RGB input.
   *
   * @return {void} 
   */
  handleRgbInput() {
    const r = parseInt(this.rgbInputs[0].value);
    const g = parseInt(this.rgbInputs[1].value);
    const b = parseInt(this.rgbInputs[2].value);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return;
    this.updateColorFields(r, g, b);
    this.syncHueWithRgb(r, g, b);
    this.renderCanvasWithHue(this.state.hue);
    this.syncLoupeToColor(r, g, b);
    this.fireColorChange({ r, g, b });
  }

  /**
   * Function to handle HEX input.
   *
   * @return {void} 
   */
  handleHexInput() {
    const hex = this.hexInput.value;
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
    const rgb = this.hexToRgb(hex);
    this.updateColorFields(rgb.r, rgb.g, rgb.b);
    this.syncHueWithRgb(rgb.r, rgb.g, rgb.b);
    this.renderCanvasWithHue(this.state.hue);
    this.syncLoupeToColor(rgb.r, rgb.g, rgb.b);
    this.fireColorChange(rgb);
  }

  /**
   * Function to sync loupe to color.
   *
   * @param {number} r A number value for R. 
   * @param {number} g A number value for G. 
   * @param {number} b A number value for B. 
   * @return {void} 
   */
  syncLoupeToColor(r, g, b) {
    const { width, height } = this.canvas;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let bestX = 0, bestY = 0, bestDist = Infinity;
    let targetIsGrayscale = (r === g && g === b);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];

        // GRAYSCALE CHECK 
        const isGray = (pr === pg && pg === pb);
        if (targetIsGrayscale && !isGray) continue;

        const dr = pr - r;
        const dg = pg - g;
        const db = pb - b;
        const dist = dr * dr + dg * dg + db * db;

        if (dist < bestDist) {
          bestDist = dist;
          bestX = x;
          bestY = y;
          if (dist === 0) break;
        }
      }
      if (bestDist === 0) break;
    }

    this.state.loupe.x = bestX;
    this.state.loupe.y = bestY;
    // RE RENDER CANVAS WITH NEW LOUPE
    this.renderCanvasWithHue(this.state.hue);  
  } 

  /**
   * Function to update color fields.
   *  
   * @param {number} r A number value for R. 
   * @param {number} g A number value for G. 
   * @param {number} b A number value for B. 
   * @return {void} 
   */
  updateColorFields(r, g, b) {
    this.rgbInputs[0].value = r;
    this.rgbInputs[1].value = g;
    this.rgbInputs[2].value = b;
    this.hexInput.value = this.rgbToHex(r, g, b);
  }

  /**
   * Function to update selected color.
   *
   * @param {string} rgbString A string of RGB.
   * @return {void} 
   */
  updateSelectedColor(rgbString) {
    if (!rgbString) return;
    const [r, g, b] = rgbString.split(',').map(Number);
    this.updateColorFields(r, g, b);
    this.syncHueWithRgb(r, g, b);
    this.renderCanvasWithHue(this.state.hue);
    this.fireColorChange({ r, g, b });
  }

  /**
   * Function to sync HUE with RGB.
   *
   * @param {number} r A number value for R. 
   * @param {number} g A number value for G. 
   * @param {number} b A number value for B. 
   * @return {void} 
   */
  syncHueWithRgb(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    
    // SKIP UPDATIONG HUE IF COLOR IS GRAYSCALE OR NEUTRAL
    if (max - min < 10) return;

    const [h] = this.rgbToHsl(r, g, b);
    this.state.hue = Math.round(h * 360);
    this.renderHueBar();
  }

  /**
   * Function to fire color change.
   * 
   * @param {number} r A number value for R. 
   * @param {number} g A number value for G. 
   * @param {number} b A number value for B. 
   * @return {void} 
   */
  fireColorChange({ r, g, b }) {
    const hex = this.rgbToHex(r, g, b);
    if (typeof this.onColorChangeCallback === 'function') {
      this.onColorChangeCallback({ r, g, b, hex });
    }
    this.dispatchEvent(new CustomEvent("color-change", {
      detail: { r, g, b, hex },
      bubbles: true,
      composed: true
    }));

    // UPDATE PREVIEW BOX
    const previewBox = this.querySelector("#preview-box");
    if (previewBox) previewBox.style.backgroundColor = hex;
  }

  /**
   * Function to render canvas with hue.
   * 
   * @param {number} hue A number for hue.
   * @return {void} 
   */
  renderCanvasWithHue(hue) {
    const { width, height } = this.state;
    const imageData = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sat = x / (width - 1);
        const light = 1 - y / (height - 1);
        const [r, g, b] = this.hslToRgb(hue / 360, sat, light);
        const idx = (y * width + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    this.ctx.putImageData(imageData, 0, 0);

    const { x, y, size } = this.state.loupe;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, 2 * Math.PI);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#fff";
    this.ctx.stroke();
  }


  /**
   * Function to render HUE bar.
   *
   * @return {void} 
   */
  renderHueBar() {
    const gradient = this.hueCtx.createLinearGradient(0, 0, this.hueBar.width, 0);
    for (let i = 0; i <= 360; i += 10) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    this.hueCtx.fillStyle = gradient;
    this.hueCtx.fillRect(0, 0, this.hueBar.width, this.hueBar.height);

    const x = (this.state.hue / 360) * this.hueBar.width;
    this.hueCtx.beginPath();
    this.hueCtx.arc(x, this.hueBar.height / 2, this.state.huebarLoupeSize, 0, 2 * Math.PI);
    this.hueCtx.fillStyle = "rgba(255,255,255,0.0)";
    this.hueCtx.strokeStyle = "#fff";
    this.hueCtx.lineWidth = 2;
    this.hueCtx.fill();
    this.hueCtx.stroke();
  }

  /**
	 * Function to convert RGB to HEX.
   * 
   * @param {number} r A number for R value.
   * @param {number} g A number for G value.
   * @param {number} b A number for B value.
   * @return {array} A HEX value.
   */
  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  /**
	 * Function to convert HEX to RGB.
	 *
   * @param {string} hex A string for hex value.
	 * @return {array} RGB value.
	 */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Function to convert HSL to RGB.
   * 
   * @param {number} h An int for H value.
   * @param {number} s An int for S value.
   * @param {number} l An int for L value.
   * @return {array} An array of RGB values. 
   */
  hslToRgb(h, s, l) {
    let r, g, b;
    if (s == 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Function to convert RGB to HSL.
   *
   * @param {number} r A number for R value.
   * @param {number} g A number for G value.
   * @param {number} b A number for B value.
   * @return {array} An array of HSL values.
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }
} 
 
customElements.define("color-picker-component", ColorPickerComponent);
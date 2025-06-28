# COLORPICKER_COMPONENT
Web component for selecting colors and receiving HEX and RGB values.

# FEATURES

* Canvas-based color selection with hue/saturation/lightness visualization
* Hue slider bar with a draggable loupe
* Manual input via RGB fields or HEX
* Grayscale detection to handle neutral tones correctly
* Two-way state management - change one input (canvas, RGB, HEX) and everything updates
* Live preview and a "color-change" event for listening to user input
* A "ready" event can be used to know when the component is initialized

# USING COLOR-PICKER-COMPONENT

Add a colorpicker without a color selected

```
<color-picker-component></color-picker-component>
```

Add a colorpicker with custom attributes 

```
<color-picker-component 
  title="Select a Color"
  width="300" 
  height="150" 
  selectedcolor="255,0,0">
</color-picker-component>
```

Add a colorpicker with a color selected: 
```
<color-picker-component selectedcolor="244,83,255"></color-picker-component>
```

Listen to color changes via the following event listener detail which outputs: { r, g, b, hex } 

```
document.querySelector("color-picker-component").addEventListener("color-change", (e) => {
  console.log("New color:", e.detail);
});
```

# AUTHOR 

Shaun Nelson - [snndeveloper]
(https://github.com/snndeveloper)

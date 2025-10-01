import {
  children,
  Component,
  createEffect,
  createSignal,
  ParentProps,
} from "solid-js";
import { extractColors } from "extract-colors";

const TARGET_LIGHTNESS = 0.3;
const DEFAULT_ACCENT_COLOR = "#111111";
const DEFAULT_UI_ACCENT = "#1DB954"; // fallback for sliders/bars

interface DynamicBackgroundType extends ParentProps {
  imgUrl?: string;
}

const DynamicBackground: Component<DynamicBackgroundType> = (props) => {
  const [accentColor, setAccentColor] = createSignal(DEFAULT_ACCENT_COLOR);
  const [uiAccentColor, setUiAccentColor] = createSignal(DEFAULT_UI_ACCENT);

  createEffect(() => {
    if (props.imgUrl) {
      extractColors(props.imgUrl, {
        crossOrigin: "anonymous",
        lightnessDistance: 0.1,
      })
        .then((colors) => {
          // Background accent: closest to target lightness
          let closestToDarkish = 10;
          let bgIndex = 0;
          colors.forEach((color, index) => {
            const lightnessDifferent = Math.abs(color.lightness - TARGET_LIGHTNESS);
            if (lightnessDifferent < closestToDarkish) {
              closestToDarkish = lightnessDifferent;
              bgIndex = index;
            }
          });
          const bg = colors[bgIndex];
          setAccentColor(bg.hex);

          // UI accent: pick most saturated color different from bg
          let uiIdx = -1;
          let bestSat = -1;
          colors.forEach((c, idx) => {
            if (idx === bgIndex) return;
            const sat = c.saturation ?? 0;
            if (sat > bestSat) {
              bestSat = sat;
              uiIdx = idx;
            }
          });
          const ui = uiIdx >= 0 ? colors[uiIdx].hex : DEFAULT_UI_ACCENT;
          setUiAccentColor(ui);

          // Expose to :root so fixed bars can read it
          if (typeof document !== "undefined") {
            const root = document.documentElement;
            root.style.setProperty("--accent-ui", ui);
          }
        })
        .catch(console.error);
    } else {
      // setAccentColor(DEFAULT_ACCENT_COLOR);
    }
  });

  return (
    <div
      class="h-full w-full top-0 left-0 p-12 bg-black fixed text-white"
      style={{
        "background-color": `${accentColor()}`,
        "--accent-ui": uiAccentColor(),
      }}
    >
      {children(() => props.children)()}
    </div>
  );
};

export default DynamicBackground;

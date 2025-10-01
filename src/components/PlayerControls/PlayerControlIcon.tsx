import { Component, ParentProps } from "solid-js";

interface Props extends ParentProps {
  src: string;
  isDisabled?: boolean;
  enlargeIcon?: boolean;
  showActiveIndicator?: boolean;
  onClick?: () => void;
}

const PlayerControlIcon: Component<Props> = (props) => {
  const dimensions = props.enlargeIcon ? 72 : 48;
  return (
    <button
      class={`group relative ${!props.isDisabled ? "opacity-100" : "pointer-events-none opacity-25"
        }`}
      disabled={props.isDisabled}
      onClick={props.onClick}
    >
      <img class="group-hover:scale-105 " src={props.src} width={dimensions} height={dimensions} />
      {props.showActiveIndicator ? (
        <span 
          class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rounded-full"
          style={{ 
            "background-color": "var(--accent-ui, #1DB954)",
            "box-shadow": "0 0 8px color-mix(in srgb, var(--accent-ui, #1DB954) 25%, transparent)",
            "transform": "translateX(-75%)"
          }}
        ></span>
      ) : null}
    </button>
  );
};

export default PlayerControlIcon;

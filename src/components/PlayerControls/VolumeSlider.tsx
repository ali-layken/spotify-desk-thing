import { Component, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { trpc } from "~/utils/trpc";

type Props = {
  disabled?: boolean;
};

// Helper to ease snapping back: keep a short-lived "authoritative" local value
// while server/state catches up, then allow remote value to resume control.
export const VolumeSlider: Component<Props> = (props) => {
  const nowPlaying = trpc.metadata.nowPlaying.useQuery();
  const utils = trpc.useContext();
  const onSuccessMutator = () => ({
    onSuccess: () => {
      // refresh device state a moment after volume changes
      setTimeout(() => utils.metadata.nowPlaying.invalidate(), 200);
    },
  });
  const setVolume = trpc.actions.setVolume.useMutation(onSuccessMutator);

  // local UI state
  const [isDragging, setIsDragging] = createSignal(false);
  const [localVolume, setLocalVolume] = createSignal<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = createSignal<number>(0);

  const deviceVolume = createMemo(() => nowPlaying.data?.device?.volume_percent ?? 0);
  const currentValue = createMemo(() => {
    // During drag, always use local value
    if (isDragging() && localVolume() != null) return localVolume()!;
    // During brief cooldown, keep showing last local value to avoid bounce
    if (Date.now() < cooldownUntil() && localVolume() != null) return localVolume()!;
    return deviceVolume();
  });

  // Debounce timer for server updates
  let debounceId: number | undefined;
  onCleanup(() => {
    if (debounceId) clearTimeout(debounceId);
  });

  const commitVolume = (v: number) => {
    // Clamp to [0,100]
    const vol = Math.max(0, Math.min(100, Math.round(v)));
    // short cooldown to prevent UI jumping before nowPlaying refresh lands
    setCooldownUntil(Date.now() + 700);
    // Debounce network call
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
  const deviceId = nowPlaying.data?.device?.id ?? undefined;
  setVolume.mutate({ volume_percent: vol, device_id: deviceId });
    }, 120) as unknown as number;
  };

  const onInput = (e: InputEvent & { currentTarget: HTMLInputElement; target: HTMLInputElement }) => {
    const v = Number(e.currentTarget.value);
    setLocalVolume(v);
    commitVolume(v);
  };

  const onPointerDown = () => setIsDragging(true);
  const onPointerUp = () => {
    setIsDragging(false);
    // allow remote value to take over after cooldown
    setTimeout(() => setLocalVolume(null), 800);
  };

  // Thicker Spotify-like slider matching the bottom progress color (#1DB954)
  return (
    <div class="flex items-center select-none flex-1 min-w-0">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={currentValue()}
        disabled={props.disabled}
        onInput={onInput}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        class="h-3 w-full appearance-none bg-transparent cursor-pointer"
      />
      <style>
        {`
        /* Slider sizes */
        input[type=range] { --thumb-size: 16px; }
        input[type=range]::-webkit-slider-runnable-track {
          background: rgba(255,255,255,0.12);
          height: 8px;
          border-radius: 9999px;
        }
        input[type=range]::-moz-range-track {
          background: rgba(255,255,255,0.12);
          height: 8px;
          border-radius: 9999px;
        }
        /* Thumb */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: var(--thumb-size);
          height: var(--thumb-size);
          border-radius: 50%;
          background: #1DB954;
          margin-top: calc((8px - var(--thumb-size)) / 2);
          box-shadow: 0 0 0 8px rgba(29,185,84,0.12);
        }
        input[type=range]::-moz-range-thumb {
          width: var(--thumb-size);
          height: var(--thumb-size);
          border-radius: 50%;
          background: #1DB954;
          border: none;
          box-shadow: 0 0 0 8px rgba(29,185,84,0.12);
        }
        /* Filled progress and background */
        input[type=range]::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, #1DB954 0%, #1DB954 ${currentValue()}%, rgba(255,255,255,0.12) ${currentValue()}%, rgba(255,255,255,0.12) 100%);
        }
        input[type=range]::-moz-range-progress { background: #1DB954; height: 8px; border-radius: 9999px; }
        input[type=range]::-moz-range-track { background: rgba(255,255,255,0.12); height: 8px; border-radius: 9999px; }
        `}
      </style>
    </div>
  );
};

export default VolumeSlider;

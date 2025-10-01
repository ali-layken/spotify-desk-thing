import { Component, createMemo, createSignal, onCleanup } from "solid-js";
import { trpc } from "~/utils/trpc";

type Props = { disabled?: boolean };

const VolumeSlider: Component<Props> = (props) => {
	const nowPlaying = trpc.metadata.nowPlaying.useQuery();
	const utils = trpc.useContext();
	const onSuccessMutator = () => ({ onSuccess: () => setTimeout(() => utils.metadata.nowPlaying.invalidate(), 200) });
	const setVolume = trpc.actions.setVolume.useMutation(onSuccessMutator);

	const [isDragging, setIsDragging] = createSignal(false);
	const [localVolume, setLocalVolume] = createSignal<number | null>(null);
	const [cooldownUntil, setCooldownUntil] = createSignal<number>(0);

	const deviceVolume = createMemo(() => nowPlaying.data?.device?.volume_percent ?? 0);
	const currentValue = createMemo(() => {
		if (isDragging() && localVolume() != null) return localVolume()!;
		if (Date.now() < cooldownUntil() && localVolume() != null) return localVolume()!;
		return deviceVolume();
	});

	let debounceId: number | undefined;
	onCleanup(() => debounceId && clearTimeout(debounceId));

	const commitVolume = (v: number) => {
		const vol = Math.max(0, Math.min(100, Math.round(v)));
		setCooldownUntil(Date.now() + 700);
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
				onPointerDown={() => setIsDragging(true)}
				onPointerUp={() => setTimeout(() => { setIsDragging(false); setLocalVolume(null); }, 800)}
				class="h-3 w-full appearance-none bg-transparent cursor-pointer"
			/>
			<style>{`
				input[type=range] { --thumb-size: 16px; }
				input[type=range]::-webkit-slider-runnable-track { background: linear-gradient(90deg, var(--accent-ui, #1DB954) 0%, var(--accent-ui, #1DB954) ${currentValue()}%, color-mix(in srgb, var(--accent-ui, #1DB954) 25%, transparent) ${currentValue()}%, color-mix(in srgb, var(--accent-ui, #1DB954) 25%, transparent) 100%); height: 8px; border-radius: 9999px; }
				input[type=range]::-moz-range-track { background: color-mix(in srgb, var(--accent-ui, #1DB954) 25%, transparent); height: 8px; border-radius: 9999px; }
				input[type=range]::-moz-range-progress { background: var(--accent-ui, #1DB954); height: 8px; border-radius: 9999px; }
				input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: var(--thumb-size); height: var(--thumb-size); border-radius: 50%; background: var(--accent-ui, #1DB954); margin-top: calc((8px - var(--thumb-size)) / 2); box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent-ui, #1DB954) 20%, transparent); }
				input[type=range]::-moz-range-thumb { width: var(--thumb-size); height: var(--thumb-size); border: none; border-radius: 50%; background: var(--accent-ui, #1DB954); box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent-ui, #1DB954) 20%, transparent); }
			`}</style>
		</div>
	);
};

export default VolumeSlider;

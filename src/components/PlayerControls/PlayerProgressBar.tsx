import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { trpc } from "~/utils/trpc";

const PlayerProgressBar: Component = () => {
  const [progressMs, setProgressMs] = createSignal(0);
  const nowPlaying = trpc.metadata.nowPlaying.useQuery();

  createEffect(() => {
    // Accept 0ms as valid so progress can reset cleanly at track start
    if (nowPlaying.data?.progress_ms !== undefined) {
      setProgressMs(nowPlaying.data.progress_ms ?? 0);
    }
  });

  createEffect(() => {
    let progressInterval: any;
    if (nowPlaying.data?.is_playing) {
      progressInterval = setInterval(
        () => setProgressMs((current) => current + 1000),
        1000
      );
    }

    onCleanup(() => {
      clearInterval(progressInterval);
    });
  });

  const durationMs = createMemo(() => nowPlaying.data?.item?.duration_ms ?? 0);
  const clampedProgressMs = createMemo(() =>
    Math.max(0, Math.min(progressMs(), durationMs() || 0))
  );
  const playingProgress = createMemo(() =>
    durationMs() > 0 ? clampedProgressMs() / durationMs() : 0
  );

  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
    if (hours > 0) {
      const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${hours}:${mm}:${ss}`;
    }
    return `${minutes}:${ss}`;
  };

  return (
    <div class="w-full flex justify-center">
      {/* Expand the max width so the bar is wider and remove additional vertical spacing */}
      <div class="w-full max-w-5xl px-0">
        <div class="flex items-start gap-3">
          <span class="text-xs opacity-75 min-w-[2.5ch] text-left">
            {formatTime(clampedProgressMs())}
          </span>
          <div class="relative h-2 bg-black/30 rounded-full overflow-hidden flex-1">
            <div
              class="absolute left-0 top-0 h-full bg-[#1DB954] rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, playingProgress() * 100))}%`, transition: "width 250ms linear" }}
            />
          </div>
          <span class="text-xs opacity-75 min-w-[3.5ch] text-right">
            {formatTime(durationMs())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerProgressBar;

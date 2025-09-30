import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { trpc } from "~/utils/trpc";
import DynamicBackground from "./DynamicBackground";
import PlayerControls from "./PlayerControls/PlayerControls";
import Screensaver from "./Screensaver";
import SvgMusic from "./icons/bx-music.svg";

const PREVIEW_SIZE = 400;

const getAlbumMetadata = ({
  album,
  name,
}: {
  album: AlbumMetadata;
  name: string;
}) => ({
  preview: album.images[0].url,
  title: name,
  subtitle: album.artists.map((artist) => artist.name).join(", "),
});

const getEpisodeMetadata = (episode: EpisodeMetadata) => ({
  preview: episode.images[0].url,
  title: episode.name,
  subtitle: episode.show.name,
});

const metadataMappers: Record<
  SpotifyApi.CurrentlyPlayingObject["currently_playing_type"],
  (item: any) => UiMetadata
> = {
  track: getAlbumMetadata,
  episode: getEpisodeMetadata,
  ad: (e) => e, // TODO
  unknown: (e) => e, // TODO
};

const SpotifyNowPlaying: Component = () => {
  const utils = trpc.useContext();
  const [showScreensaver, setShowScreensaver] = createSignal(true);
  const nowPlayingQuery = trpc.metadata.nowPlaying.useQuery();
  const isSavedQuery = trpc.metadata.saved.useQuery(
    () => ({ ids: [nowPlayingQuery.data?.item?.id || ""] }),
    () => ({
      enabled: !!nowPlayingQuery.data?.item?.id,
    })
  );

  createEffect(() => {
    // Use a recursive setTimeout so the delay can be recalculated each run
    // and we avoid overlapping intervals if the refreshDelay changes.
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const thisNowPlaying = nowPlayingQuery.data;

      // Default refresh intervals (ms)
      let refreshDelay = thisNowPlaying?.is_playing ? 8000 : 15000;

      if (thisNowPlaying !== undefined) {
        const songDuration = thisNowPlaying?.item?.duration_ms ?? 0;
        const currentProgress = thisNowPlaying?.progress_ms ?? 0;
        const timeLeftOnSong = songDuration - currentProgress;

        // If song is about to end sooner than our refresh, poll sooner
        if (thisNowPlaying?.is_playing && timeLeftOnSong < refreshDelay) {
          refreshDelay = Math.max(1000, timeLeftOnSong + 1000);
        }
      }

      // Invalidate the query to refresh data, then schedule next run
      utils.metadata.nowPlaying.invalidate();

      timeoutId = setTimeout(() => {
        scheduleNext();
      }, refreshDelay) as unknown as number;
    };

    // Start the adaptive polling loop
    scheduleNext();

    onCleanup(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
  });

  const metadata = createMemo<UiMetadata>(() => {
    const mapperKey = nowPlayingQuery.data?.currently_playing_type ?? "track";
    const mapper = metadataMappers[mapperKey];

    const mapAttempt =
      mapper &&
      nowPlayingQuery.data?.item &&
      mapper(nowPlayingQuery.data?.item);

    if (!mapAttempt) {
      setShowScreensaver(true);
      return {
        preview: "",
        title: "",
        subtitle: "",
        missingNowPlayingContext: true,
      };
    } else {
      if (showScreensaver()) {
        setShowScreensaver(false);
      }
      return mapAttempt;
    }
  });

  return (
    <div class="w-full min-h-screen">
      {showScreensaver() ? (
        <Screensaver />
      ) : (
        <DynamicBackground imgUrl={metadata()?.preview}>
          {/* Allow content to use full viewport width so the cover can expand */}
          <div class="w-full max-w-full mx-auto px-6">
            <div class="flex flex-col md:flex-row items-start md:items-center gap-1">
              {/* Cover on left for wide screens, stacked on small screens */}
              <div class="flex-shrink-0 w-full md:w-2/3 lg:w-3/5">
                <div
                  class="relative flex items-center justify-center w-full"
                  style={{
                    /* Fill available vertical space but leave room for bottom bar and paddings */
                    height: "min( calc(100vh - var(--bottom-h, 120px) - 4rem), 80vmin )",
                    width: "min( calc(100vh - var(--bottom-h, 120px) - 4rem), 80vmin )",
                    "max-width": "100%",
                    "background-color": "transparent",
                    "box-sizing": "border-box",
                  }}
                >
                  <img
                    class="z-10 w-full h-full object-contain"
                    src={metadata()?.preview}
                    alt={metadata()?.title}
                  />
                </div>
              </div>

              <div class="flex-1 flex flex-col justify-center w-full md:pl-0 md:mt-0 md:max-w-[40%] md:-translate-y-3/4">
                <p class="font-extrabold text-[6vw] md:text-[4.2vw] lg:text-[3.4vw] leading-tight mt-0 mb-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {metadata()?.title}
                </p>
                <p class="opacity-75 text-[3.5vw] md:text-[2.2vw] lg:text-[1.6vw] font-bold mb-3 text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {metadata()?.subtitle}
                </p>

                <div class="mt-3">
                  <PlayerControls isSaved={!!isSavedQuery.data?.[0]} inline={true} showOnlyMain={true} />
                </div>
              </div>
            </div>
          </div>
        </DynamicBackground>
      )}
      {/* mount the global bottom player controls so the progress bar / bottom rectangle shows */}
      <PlayerControls isSaved={!!isSavedQuery.data?.[0]} />
    </div>
  );
};

export default SpotifyNowPlaying;

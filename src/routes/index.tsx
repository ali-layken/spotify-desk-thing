import { createEffect, createSignal } from "solid-js";
import SpotifyNowPlaying from "~/components/SpotifyNowPlaying";
import {
  getAuthTokenSignal,
  useSpotifyAuth,
} from "~/components/hooks/useSpotifyAuth";

const CARD_SIZE = 715;

export default function Home() {
  useSpotifyAuth();
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [showAuthError, setShowAuthError] = createSignal(false);

  const authToken = getAuthTokenSignal?.();

  createEffect(() => {
    let timerReference = null;

    // Wait a little bit, then if we're still not authenticated show an error
    timerReference = setTimeout(() => {
      if (!authToken) {
        setShowAuthError(true);
      }
    }, 2000);

    // Check to see if we're authenticated
    if (getAuthTokenSignal?.() && getAuthTokenSignal?.().length > 0) {
      clearTimeout(timerReference);
      setIsAuthenticated(true);
    }

    return () => {
      if (timerReference) clearTimeout(timerReference);
    };
  });

  return (
    <main>
      {isAuthenticated() && (
        <div class="w-screen h-screen text-white">
          <SpotifyNowPlaying />
        </div>
      )}
      {showAuthError() && (
        <div class="grid items-center justify-center h-screen">
          <p class="text-white text-center max-w-sm">
            Unable to authenticate with API. Have you set the proper auth tokens
            in the ".env" configuration file? (see README for setup
            instructions)
          </p>
        </div>
      )}
    </main>
  );
}

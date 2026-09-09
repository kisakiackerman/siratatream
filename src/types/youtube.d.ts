export {};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }

  namespace YT {
    interface Player {
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      getCurrentTime(): number;
      getDuration(): number;
      getVolume(): number;
      setVolume(volume: number): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      getPlayerState(): number;
      loadVideoById(videoId: string): void;
      destroy(): void;
      loadModule(module: string): void;
      unloadModule(module: string): void;
    }

    interface PlayerOptions {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: {
        autoplay?: 0 | 1;
        controls?: 0 | 1;
        rel?: 0 | 1;
        modestbranding?: 0 | 1;
        playsinline?: 0 | 1;
        iv_load_policy?: 0 | 3;
        cc_load_policy?: 0 | 1;
      };
      events?: {
        onReady?: (event: { target: Player }) => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }

    const Player: new (
      element: HTMLElement | string,
      options: PlayerOptions
    ) => Player;
  }
}

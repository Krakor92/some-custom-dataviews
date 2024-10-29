import type { Track } from "@/models";
import { convertTimecodeToDuration } from "@/utils";

export const FAVORITE_TRACKS_HTML_PAYLOAD_MOCK = [
  {
    html: `<article class="item" style="align-self: center;">
          <div class="thumb-stack">
              <a href="https://www.youtube.com/watch?v=8GW6sLrK40k" draggable="false" class="external-link" rel="noopener" target="_blank" data-service="youtube"><img src="https://i.pinimg.com/originals/ac/6e/74/ac6e745eaeb729f0e0ae6d6f8e6e0fe1.jpg" referrerpolicy="no-referrer" ></a>
              <div class="timecode"><span>3:33</span></div>
          </div>
          <span class="file-link"></span>
      </article>`,
    extra: {
      ".file-link": `<a
            class="internal-link "
            aria-label="DB/🎼/Resonance.md"
            data-href="DB/🎼/Resonance.md"
            href="DB/🎼/Resonance.md"
        >
            Resonance
        </a>`,
    },
  },
  {
    html: `<article class="item" style="align-self: center;">
          <div class="thumb-stack">
              <a href="https://www.youtube.com/watch?v=397y0NZNX50&t=3450" draggable="false" class="external-link" rel="noopener" target="_blank" data-service="youtube"><img src="app://0cd3c22557fed8412c23d5263186176d7d2c/home/krakor/Documents/%F0%9F%A7%A0/_assets/%F0%9F%96%BC/Thumbnails/The%20Plagues%20(The%20Prince%20of%20Egypt).jpg?1668704479365" referrerpolicy="no-referrer" ></a>
              <div class="audio-player">
                  <button class="player-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
                  </button>
                  <audio preload="metadata" data-volume="0.4">
                      <source src="app://0cd3c22557fed8412c23d5263186176d7d2c/home/krakor/Documents/%F0%9F%A7%A0/_assets/%F0%9F%8E%A7/The%20Plagues%20(Song).mp3?1670279467210"/>
                  </audio>
              </div>
              <input type="range" class="timeline" max="100" value="0">
              <div class="timecode"><span>3:26</span></div>
          </div>
          <span class="file-link"></span>
      </article>`,
    extra: {
      ".file-link": `<a
            class="internal-link "
            aria-label="DB/🎼/The Plagues.md"
            data-href="DB/🎼/The Plagues.md"
            href="DB/🎼/The Plagues.md"
        >
            The Plagues
        </a>`,
    },
  },
];

export const FAVORITE_TRACKS_MOCK: Track[] = [
  {
    title: "Resonance",
    url: "https://www.youtube.com/watch?v=8GW6sLrK40k",
    duration: convertTimecodeToDuration("3:33"),
    filepath: "DB/🎼/Resonance.md",
  },
  {
    title: "The Plagues",
    url: "https://www.youtube.com/watch?v=397y0NZNX50&t=3450",
    duration: convertTimecodeToDuration("3:26"),
    filepath: "DB/🎼/The Plagues.md",
  },
];

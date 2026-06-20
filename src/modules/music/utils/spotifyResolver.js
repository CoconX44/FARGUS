const play = require('play-dl');

const SPOTIFY_REGEX = /^https?:\/\/open\.spotify\.com\/(track|playlist|album|artist)\//;

function isSpotifyUrl(url) {
  return SPOTIFY_REGEX.test(url);
}

/**
 * Resolves a Spotify URL to YouTube search queries — no API credentials needed.
 * Uses Spotify's public embed API via play-dl.
 *
 * Returns:
 *   { type: 'track', queries: [string], name: string }
 *   { type: 'playlist'|'album', queries: string[], name: string, total: number }
 */
async function resolveSpotify(url) {
  const type = play.sp_validate(url);
  if (!type) throw new Error('Invalid Spotify URL.');

  const sp = await play.spotify(url);

  if (type === 'track') {
    const artist = sp.artists?.[0]?.name ?? '';
    return {
      type: 'track',
      name: sp.name,
      queries: [`${sp.name} ${artist}`.trim()],
    };
  }

  if (type === 'playlist' || type === 'album') {
    const MAX_TRACKS = 100;
    const tracks = await sp.all_tracks();
    const limited = tracks.slice(0, MAX_TRACKS);

    const queries = limited.map(t => {
      const artist = t.artists?.[0]?.name ?? '';
      return `${t.name} ${artist}`.trim();
    });

    return {
      type,
      name: sp.name,
      queries,
      total: tracks.length,
    };
  }

  // artist page — not playable directly
  throw new Error('Spotify artist pages are not supported. Link a track, album, or playlist instead.');
}

module.exports = { isSpotifyUrl, resolveSpotify };

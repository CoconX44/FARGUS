/**
 * Resolves Spotify URLs to YouTube search queries using play-dl.
 * No Spotify API credentials required — play-dl scrapes public metadata.
 */
const playdl = require('play-dl');

/**
 * Returns true if the given string is a Spotify track/album/playlist URL.
 * @param {string} url
 * @returns {boolean}
 */
function isSpotifyUrl(url) {
  return /open\.spotify\.com\/(track|album|playlist)\//.test(url);
}

/**
 * Resolves a Spotify URL to searchable query strings for YouTube.
 * @param {string} url
 * @returns {Promise<{ type: string, name: string, queries: string[] }>}
 */
async function resolveSpotify(url) {
  const data = await playdl.spotify(url);

  if (data.type === 'track') {
    const query = `${data.name} ${data.artists[0]?.name ?? ''}`.trim();
    return { type: 'track', name: data.name, queries: [query] };
  }

  if (data.type === 'album' || data.type === 'playlist') {
    await data.fetch();
    const queries = data.tracks.map(t =>
      `${t.name} ${t.artists[0]?.name ?? ''}`.trim(),
    );
    return { type: data.type, name: data.name, queries };
  }

  throw new Error('Unsupported Spotify URL type');
}

module.exports = { isSpotifyUrl, resolveSpotify };

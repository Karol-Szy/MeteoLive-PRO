export function initPlayer() {
  const video = document.getElementById('weatherVideo');
  const frame = video.closest('.video-frame');
  const play = document.getElementById('videoPlay');
  const big = document.getElementById('bigPlay');
  const range = document.getElementById('videoProgress');
  const clock = document.getElementById('videoTime');
  const mute = document.getElementById('videoMute');
  const captions = document.getElementById('captionsToggle');
  const fullscreen = document.getElementById('fullscreenButton');
  const chapters = [...document.querySelectorAll('.chapters button')];
  const caption = document.getElementById('videoCaption');
  const track = video.textTracks[0];
  let captionsOn = true;
  let idleTimer = 0;
  const setIcon = (button, name) => button.querySelector('use').setAttribute('href', `#${name}`);

  const format = seconds => {
    const s = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  function sync() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    range.value = duration ? String((100 * video.currentTime) / duration) : '0';
    range.setAttribute('aria-valuetext', `${format(video.currentTime)} z ${format(duration)}`);
    clock.textContent = `${format(video.currentTime)} / ${format(duration)}`;
    setIcon(play, video.paused ? 'i-play' : 'i-pause');
    play.setAttribute('aria-label', video.paused ? 'Odtwórz' : 'Wstrzymaj');
    frame.classList.toggle('playing', !video.paused);
    const current = chapters.reduce((found, button, i) => (video.currentTime >= Number(button.dataset.time) ? i : found), 0);
    chapters.forEach((button, i) => button.classList.toggle('is-current', i === current && (video.currentTime > 0 || !video.paused)));
  }

  async function toggle() {
    if (video.paused) {
      try { await video.play(); } catch { sync(); }
    } else {
      video.pause();
    }
  }

  function showCue() {
    const cue = track?.activeCues?.[0];
    caption.textContent = cue ? cue.text.replace(/<[^>]+>/g, '') : '';
    caption.hidden = !captionsOn || !cue;
  }

  function setCaptions(on) {
    captionsOn = on;
    captions.setAttribute('aria-pressed', String(on));
    showCue();
  }

  function wake() {
    frame.classList.remove('idle');
    clearTimeout(idleTimer);
    if (video.paused) return;
    idleTimer = setTimeout(() => {
      if (!video.paused && !frame.querySelector(':focus-visible')) frame.classList.add('idle');
    }, 2500);
  }

  play.addEventListener('click', toggle);
  big.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  ['timeupdate', 'loadedmetadata', 'play', 'pause', 'ended'].forEach(type => video.addEventListener(type, sync));
  ['play', 'pause', 'ended'].forEach(type => video.addEventListener(type, wake));
  ['pointermove', 'pointerdown', 'focusin', 'keydown'].forEach(type => frame.addEventListener(type, wake));
  if (track) {
    track.mode = 'hidden';
    track.addEventListener('cuechange', showCue);
  }
  range.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = (Number(range.value) * video.duration) / 100;
    sync();
  });
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
    setIcon(mute, video.muted ? 'i-mute' : 'i-volume');
    mute.setAttribute('aria-label', video.muted ? 'Włącz dźwięk' : 'Wycisz');
  });
  captions.addEventListener('click', () => setCaptions(captions.getAttribute('aria-pressed') !== 'true'));
  fullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else frame.requestFullscreen?.();
  });
  chapters.forEach(button => button.addEventListener('click', () => {
    video.currentTime = Number(button.dataset.time);
    if (video.paused) toggle();
  }));
  video.addEventListener('error', () => { clock.textContent = 'Nie udało się załadować filmu'; });
  sync();
}

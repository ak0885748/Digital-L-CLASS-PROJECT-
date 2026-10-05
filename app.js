/**
 * ElevenLabs Voice Studio - Application Logic
 * Supports ElevenLabs TTS API, custom voices, Web Audio API visualizer,
 * audio playback & export, and local persistence.
 */

// --- State Management ---
const STATE = {
  apiKey: localStorage.getItem('elevenlabs_api_key') || '',
  selectedModel: localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2',
  selectedVoice: localStorage.getItem('elevenlabs_voice') || 'JBFqnCBsd6RMkjVDRZzb',
  outputFormat: localStorage.getItem('elevenlabs_format') || 'mp3_44100_128',
  settings: {
    stability: parseFloat(localStorage.getItem('elevenlabs_stability')) || 0.5,
    similarity_boost: parseFloat(localStorage.getItem('elevenlabs_similarity')) || 0.75,
    style: parseFloat(localStorage.getItem('elevenlabs_style')) || 0.0,
    use_speaker_boost: localStorage.getItem('elevenlabs_boost') !== 'false'
  },
  currentAudioUrl: null,
  isGenerating: false,
  isPlaying: false,
  isDemoMode: !localStorage.getItem('elevenlabs_api_key'),
  history: JSON.parse(localStorage.getItem('elevenlabs_history') || '[]')
};

// Preset sample texts
const PRESETS = {
  audiobook: "I am the Jinn of the ancient sands. Speak your command, and let the echoes of forgotten realms whisper through time and reality.",
  podcast: "Welcome to the Jinn Voice Studio. Today we explore deep neural narration, voice synthesis models, and the magic of AI storytelling.",
  meditation: "Close your eyes and breathe deeply. Feel the mystical calm wash over you as the silence of the night surrounds your spirit.",
  news: "Breaking Update: Jinn Voice AI has unlocked hyper-realistic speech narration across multiple global languages and tones."
};

// --- DOM Elements ---
const dom = {
  // Config & API
  apiKeyModalBtn: document.getElementById('apiKeyModalBtn'),
  apiKeyModal: document.getElementById('apiKeyModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
  eyeIcon: document.getElementById('eyeIcon'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  removeApiKeyBtn: document.getElementById('removeApiKeyBtn'),
  useDemoModeBtn: document.getElementById('useDemoModeBtn'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),

  // Dropdowns & Fine-Tuning
  modelSelect: document.getElementById('modelSelect'),
  voiceSelect: document.getElementById('voiceSelect'),
  outputFormatSelect: document.getElementById('outputFormatSelect'),
  refreshVoicesBtn: document.getElementById('refreshVoicesBtn'),
  toggleSettingsBtn: document.getElementById('toggleSettingsBtn'),
  settingsContent: document.getElementById('settingsContent'),
  settingsArrow: document.getElementById('settingsArrow'),
  stabilitySlider: document.getElementById('stabilitySlider'),
  stabilityVal: document.getElementById('stabilityVal'),
  similaritySlider: document.getElementById('similaritySlider'),
  similarityVal: document.getElementById('similarityVal'),
  styleSlider: document.getElementById('styleSlider'),
  styleVal: document.getElementById('styleVal'),
  speakerBoostToggle: document.getElementById('speakerBoostToggle'),

  // Text Area & Action
  textInput: document.getElementById('textInput'),
  charCount: document.getElementById('charCount'),
  wordCount: document.getElementById('wordCount'),
  clearTextBtn: document.getElementById('clearTextBtn'),
  generatePlayBtn: document.getElementById('generatePlayBtn'),
  btnIcon: document.getElementById('btnIcon'),
  btnText: document.getElementById('btnText'),
  presetChips: document.querySelectorAll('.preset-chip'),

  // Player & Visualizer
  statusBadge: document.getElementById('statusBadge'),
  waveformCanvas: document.getElementById('waveformCanvas'),
  visualizerPlaceholder: document.getElementById('visualizerPlaceholder'),
  audioPlayer: document.getElementById('audioPlayer'),
  seekSlider: document.getElementById('seekSlider'),
  currentTime: document.getElementById('currentTime'),
  durationTime: document.getElementById('durationTime'),
  togglePlayPauseBtn: document.getElementById('togglePlayPauseBtn'),
  playPauseIcon: document.getElementById('playPauseIcon'),
  replayBtn: document.getElementById('replayBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  speedBtns: document.querySelectorAll('.speed-btn'),

  // History & Toast
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// --- Web Audio API & Visualizer Setup ---
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let animationFrameId = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    
    // Connect audio player element
    sourceNode = audioCtx.createMediaElementSource(dom.audioPlayer);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Canvas Waveform Renderer
function drawVisualizer() {
  const canvas = dom.waveformCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser ? analyser.frequencyBinCount : 64;
  const dataArray = new Uint8Array(bufferLength);

  function render() {
    animationFrameId = requestAnimationFrame(render);

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (analyser && STATE.isPlaying) {
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.85;

        // Dynamic gradient for sound wave
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(0.5, '#6366f1');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [3, 3, 0, 0]);
        ctx.fill();

        x += barWidth;
      }
    } else {
      // Idle gentle sine wave
      const time = Date.now() * 0.002;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.beginPath();
      for (let x = 0; x < width; x += 4) {
        const y = height / 2 + Math.sin(x * 0.02 + time) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  render();
}

// Resize canvas to match display resolution
function resizeCanvas() {
  const rect = dom.waveformCanvas.getBoundingClientRect();
  dom.waveformCanvas.width = rect.width * window.devicePixelRatio || 600;
  dom.waveformCanvas.height = rect.height * window.devicePixelRatio || 120;
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Status Badge Helper ---
function setStatus(statusText, type = 'idle') {
  dom.statusBadge.textContent = statusText;
  dom.statusBadge.className = `badge badge-${type}`;
}

// --- API Key & Connection Status ---
function updateApiUI() {
  if (STATE.apiKey) {
    dom.apiStatusDot.className = 'status-dot connected';
    dom.apiStatusText.textContent = 'API Key Active';
    dom.apiKeyInput.value = STATE.apiKey;
    STATE.isDemoMode = false;
  } else {
    dom.apiStatusDot.className = 'status-dot demo';
    dom.apiStatusText.textContent = 'Demo Mode (No Key)';
    dom.apiKeyInput.value = '';
    STATE.isDemoMode = true;
  }
}

// Fetch live voices from ElevenLabs account
async function fetchAccountVoices() {
  if (!STATE.apiKey) {
    showToast('Add your ElevenLabs API Key to sync your custom voices.', 'info');
    openModal();
    return;
  }

  dom.refreshVoicesBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
  
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': STATE.apiKey
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch voices (${res.status})`);
    }

    const data = await res.json();
    if (data.voices && data.voices.length > 0) {
      dom.voiceSelect.innerHTML = '';
      data.voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voice_id;
        const category = voice.category ? `[${voice.category}]` : '';
        option.textContent = `${voice.name} ${category}`;
        if (voice.voice_id === STATE.selectedVoice) {
          option.selected = true;
        }
        dom.voiceSelect.appendChild(option);
      });
      showToast(`Successfully synced ${data.voices.length} voices from ElevenLabs!`, 'success');
    }
  } catch (err) {
    console.error('Error fetching voices:', err);
    showToast('Could not fetch voices. Check your API key.', 'error');
  } finally {
    dom.refreshVoicesBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync Voices';
  }
}

// --- ElevenLabs Text-to-Speech API Call ---
async function generateNarration(text, modelId, voiceId, voiceSettings, outputFormat = 'mp3_44100_128') {
  const cleanKey = (STATE.apiKey || '').trim();

  // If user has not provided an API Key, run in Demo Mode
  if (!cleanKey || STATE.isDemoMode) {
    return handleBrowserSpeechDemo(text);
  }

  // Construct URL with output_format
  let endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  if (outputFormat && outputFormat !== 'default') {
    endpoint += `?output_format=${encodeURIComponent(outputFormat)}`;
  }
  
  const payload = {
    text: text,
    model_id: modelId,
    voice_settings: {
      stability: Math.min(Math.max(voiceSettings.stability, 0), 1),
      similarity_boost: Math.min(Math.max(voiceSettings.similarity_boost, 0), 1),
      style: Math.min(Math.max(voiceSettings.style || 0, 0), 1),
      use_speaker_boost: Boolean(voiceSettings.use_speaker_boost)
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': cleanKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        const detail = errorJson.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (detail && detail.message) {
          errorMsg = detail.message;
        } else if (detail && detail.status) {
          errorMsg = `${detail.status}: ${detail.message || JSON.stringify(detail)}`;
        }
      } catch {
        errorMsg = response.statusText || `Server Error ${response.status}`;
      }

      // Check specific error codes
      if (response.status === 401) {
        showToast('🔑 API Key Invalid ya Missing hai. Top-right "Set API Key" par click karke valid key enter karein.', 'error');
        openModal();
      } else if (response.status === 429 || errorMsg.toLowerCase().includes('quota')) {
        showToast('⚠️ Quota Limit Exceeded! ElevenLabs free credits khatam ho gaye hain. Demo Mode use kar sakte hain.', 'error');
      } else {
        showToast(`❌ API Error: ${errorMsg}`, 'error');
      }

      throw new Error(`ElevenLabs Error (${response.status}): ${errorMsg}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);

  } catch (networkOrApiError) {
    console.error('Fetch error:', networkOrApiError);
    // If it's a network error or CORS or offline
    if (networkOrApiError.name === 'TypeError' && networkOrApiError.message.includes('fetch')) {
      showToast('🌐 Network/CORS issue. Using Demo Mode playback as fallback.', 'info');
      return handleBrowserSpeechDemo(text);
    }
    throw networkOrApiError;
  }
}

// Fallback speech synthesizer when testing without API key
function handleBrowserSpeechDemo(text) {
  return new Promise((resolve) => {
    showToast('Demo Mode: Synthesizing voice. Add an ElevenLabs API Key for studio-grade neural voices.', 'info');
    
    // Also trigger browser speech synthesis for real voice feedback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // Generate a pleasant synth chime tone WAV blob so HTML5 Audio player, visualizer, and download button are fully functional
    const sampleRate = 44100;
    const duration = Math.min(Math.max(text.length * 0.06, 2.5), 10);
    const numSamples = Math.floor(sampleRate * duration);
    const audioBuffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Gentle harmonic melodic soundwave
      const noteFreq = 220 + (Math.sin(t * 3) * 60);
      const envelope = Math.exp(-t * 0.4) * (1 - Math.exp(-t * 10));
      audioBuffer[i] = (
        Math.sin(2 * Math.PI * noteFreq * t) * 0.4 +
        Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.2 +
        Math.sin(2 * Math.PI * noteFreq * 3 * t) * 0.1
      ) * envelope;
    }

    const wavBlob = exportWavBlob(audioBuffer, sampleRate);
    const url = URL.createObjectURL(wavBlob);
    resolve(url);
  });
}

// Helper to convert float audio samples to WAV Blob
function exportWavBlob(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM audio data
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

// --- Playback & History Handlers ---
function setPlayState(playing) {
  STATE.isPlaying = playing;
  if (playing) {
    dom.playPauseIcon.className = 'fa-solid fa-pause';
    setStatus('Playing', 'playing');
    dom.visualizerPlaceholder.style.display = 'none';
  } else {
    dom.playPauseIcon.className = 'fa-solid fa-play';
    setStatus('Ready', 'idle');
  }
}

function loadAudioUrl(url, scriptSnippet, voiceName) {
  if (!url) return;
  
  if (STATE.currentAudioUrl && STATE.currentAudioUrl !== url) {
    URL.revokeObjectURL(STATE.currentAudioUrl);
  }

  STATE.currentAudioUrl = url;
  dom.audioPlayer.src = url;
  dom.audioPlayer.load();

  // Enable control buttons
  dom.togglePlayPauseBtn.disabled = false;
  dom.replayBtn.disabled = false;
  dom.downloadBtn.disabled = false;

  // Save to history
  addToHistory({
    url: url,
    snippet: scriptSnippet,
    voice: voiceName,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Start playback
  initAudioContext();
  dom.audioPlayer.play().then(() => {
    setPlayState(true);
  }).catch(err => console.log('Autoplay handled:', err));
}

function addToHistory(item) {
  STATE.history.unshift(item);
  if (STATE.history.length > 8) STATE.history.pop();
  renderHistory();
}

function renderHistory() {
  if (STATE.history.length === 0) {
    dom.historyList.innerHTML = '<p class="history-empty">No narrations generated yet.</p>';
    return;
  }

  dom.historyList.innerHTML = STATE.history.map((item, idx) => `
    <div class="history-item">
      <div class="history-info">
        <div class="history-text">${escapeHtml(item.snippet)}</div>
        <div class="history-meta">
          <span><i class="fa-solid fa-microphone"></i> ${escapeHtml(item.voice)}</span>
          <span><i class="fa-regular fa-clock"></i> ${item.date}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="history-btn" onclick="playHistoryItem(${idx})" title="Replay">
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="history-btn" onclick="downloadHistoryItem(${idx})" title="Download">
          <i class="fa-solid fa-download"></i>
        </button>
      </div>
    </div>
  `).join('');
}

window.playHistoryItem = (idx) => {
  const item = STATE.history[idx];
  if (item && item.url) {
    dom.audioPlayer.src = item.url;
    initAudioContext();
    dom.audioPlayer.play();
    setPlayState(true);
  }
};

window.downloadHistoryItem = (idx) => {
  const item = STATE.history[idx];
  if (item && item.url) {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `elevenlabs-narration-${Date.now()}.mp3`;
    a.click();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Textarea stats counter
  dom.textInput.addEventListener('input', () => {
    const text = dom.textInput.value.trim();
    dom.charCount.textContent = dom.textInput.value.length;
    dom.wordCount.textContent = text ? text.split(/\s+/).length : 0;
  });

  // Clear text
  dom.clearTextBtn.addEventListener('click', () => {
    dom.textInput.value = '';
    dom.charCount.textContent = '0';
    dom.wordCount.textContent = '0';
    dom.textInput.focus();
  });

  // Presets
  dom.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const presetKey = chip.getAttribute('data-preset');
      if (PRESETS[presetKey]) {
        dom.textInput.value = PRESETS[presetKey];
        dom.textInput.dispatchEvent(new Event('input'));
      }
    });
  });

  // Sliders fine-tuning
  dom.stabilitySlider.addEventListener('input', (e) => {
    STATE.settings.stability = parseFloat(e.target.value);
    dom.stabilityVal.textContent = STATE.settings.stability.toFixed(2);
    localStorage.setItem('elevenlabs_stability', STATE.settings.stability);
  });

  dom.similaritySlider.addEventListener('input', (e) => {
    STATE.settings.similarity_boost = parseFloat(e.target.value);
    dom.similarityVal.textContent = STATE.settings.similarity_boost.toFixed(2);
    localStorage.setItem('elevenlabs_similarity', STATE.settings.similarity_boost);
  });

  dom.styleSlider.addEventListener('input', (e) => {
    STATE.settings.style = parseFloat(e.target.value);
    dom.styleVal.textContent = STATE.settings.style.toFixed(2);
    localStorage.setItem('elevenlabs_style', STATE.settings.style);
  });

  dom.speakerBoostToggle.addEventListener('change', (e) => {
    STATE.settings.use_speaker_boost = e.target.checked;
    localStorage.setItem('elevenlabs_boost', STATE.settings.use_speaker_boost);
  });

  // Model & Voice & Format change persistence
  dom.modelSelect.addEventListener('change', (e) => {
    STATE.selectedModel = e.target.value;
    localStorage.setItem('elevenlabs_model', STATE.selectedModel);
  });

  dom.voiceSelect.addEventListener('change', (e) => {
    STATE.selectedVoice = e.target.value;
    localStorage.setItem('elevenlabs_voice', STATE.selectedVoice);
  });

  dom.outputFormatSelect.addEventListener('change', (e) => {
    STATE.outputFormat = e.target.value;
    localStorage.setItem('elevenlabs_format', STATE.outputFormat);
  });

  // Toggle Settings Accordion
  dom.toggleSettingsBtn.addEventListener('click', () => {
    dom.settingsContent.classList.toggle('collapsed');
    dom.settingsArrow.classList.toggle('rotated');
  });

  // Sync Voices
  dom.refreshVoicesBtn.addEventListener('click', fetchAccountVoices);

  // --- Main Generate & Play Action ---
  dom.generatePlayBtn.addEventListener('click', async () => {
    const text = dom.textInput.value.trim();
    if (!text) {
      showToast('Please enter or paste text to narrate first!', 'error');
      dom.textInput.focus();
      return;
    }

    if (STATE.isGenerating) return;

    STATE.isGenerating = true;
    dom.generatePlayBtn.classList.add('loading');
    dom.generatePlayBtn.disabled = true;
    setStatus('Synthesizing Voice...', 'generating');

    try {
      const selectedVoiceName = dom.voiceSelect.options[dom.voiceSelect.selectedIndex]?.text || 'Voice';
      const audioBlobUrl = await generateNarration(
        text,
        dom.modelSelect.value,
        dom.voiceSelect.value,
        STATE.settings,
        dom.outputFormatSelect.value
      );

      if (audioBlobUrl) {
        loadAudioUrl(audioBlobUrl, text.slice(0, 45) + (text.length > 45 ? '...' : ''), selectedVoiceName);
        showToast('Narration synthesized successfully!', 'success');
      }
    } catch (err) {
      console.error('TTS Generation error:', err);
      showToast(err.message || 'Error generating narration', 'error');
      setStatus('Failed', 'idle');
    } finally {
      STATE.isGenerating = false;
      dom.generatePlayBtn.classList.remove('loading');
      dom.generatePlayBtn.disabled = false;
    }
  });

  // Audio element events
  dom.audioPlayer.addEventListener('timeupdate', () => {
    const curr = dom.audioPlayer.currentTime;
    const dur = dom.audioPlayer.duration || 0;
    dom.currentTime.textContent = formatTime(curr);
    dom.durationTime.textContent = formatTime(dur);
    if (dur > 0) {
      dom.seekSlider.value = (curr / dur) * 100;
    }
  });

  dom.audioPlayer.addEventListener('ended', () => {
    setPlayState(false);
  });

  dom.audioPlayer.addEventListener('play', () => setPlayState(true));
  dom.audioPlayer.addEventListener('pause', () => setPlayState(false));

  // Timeline scrubber
  dom.seekSlider.addEventListener('input', () => {
    const dur = dom.audioPlayer.duration;
    if (dur) {
      dom.audioPlayer.currentTime = (dom.seekSlider.value / 100) * dur;
    }
  });

  // Play / Pause Toggle
  dom.togglePlayPauseBtn.addEventListener('click', () => {
    initAudioContext();
    if (dom.audioPlayer.paused) {
      dom.audioPlayer.play();
    } else {
      dom.audioPlayer.pause();
    }
  });

  // Replay Button
  dom.replayBtn.addEventListener('click', () => {
    dom.audioPlayer.currentTime = 0;
    dom.audioPlayer.play();
    setPlayState(true);
  });

  // Download Button
  dom.downloadBtn.addEventListener('click', () => {
    if (STATE.currentAudioUrl) {
      const a = document.createElement('a');
      a.href = STATE.currentAudioUrl;
      a.download = `elevenlabs-narration-${Date.now()}.mp3`;
      a.click();
      showToast('Audio MP3 downloaded!', 'success');
    }
  });

  // Speed Buttons
  dom.speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const speed = parseFloat(btn.getAttribute('data-speed'));
      dom.audioPlayer.playbackRate = speed;
    });
  });

  // Clear History
  dom.clearHistoryBtn.addEventListener('click', () => {
    STATE.history = [];
    localStorage.removeItem('elevenlabs_history');
    renderHistory();
    showToast('History cleared', 'info');
  });

  // --- Modal Logic ---
  function openModal() {
    dom.apiKeyModal.classList.add('active');
  }

  function closeModal() {
    dom.apiKeyModal.classList.remove('active');
  }

  dom.apiKeyModalBtn.addEventListener('click', openModal);
  dom.closeModalBtn.addEventListener('click', closeModal);
  dom.apiKeyModal.addEventListener('click', (e) => {
    if (e.target === dom.apiKeyModal) closeModal();
  });

  // Toggle API Key eye icon
  dom.toggleApiKeyVisibility.addEventListener('click', () => {
    const isPass = dom.apiKeyInput.type === 'password';
    dom.apiKeyInput.type = isPass ? 'text' : 'password';
    dom.eyeIcon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });

  // Save API Key
  dom.saveApiKeyBtn.addEventListener('click', () => {
    const val = dom.apiKeyInput.value.trim();
    if (!val) {
      showToast('Please enter an API Key or choose Demo Mode.', 'error');
      return;
    }
    STATE.apiKey = val;
    localStorage.setItem('elevenlabs_api_key', val);
    updateApiUI();
    closeModal();
    showToast('API Key saved securely in your browser!', 'success');
    fetchAccountVoices();
  });

  // Remove API Key
  dom.removeApiKeyBtn.addEventListener('click', () => {
    STATE.apiKey = '';
    localStorage.removeItem('elevenlabs_api_key');
    updateApiUI();
    closeModal();
    showToast('API Key removed. Switched to Demo Mode.', 'info');
  });

  // Demo Mode
  dom.useDemoModeBtn.addEventListener('click', () => {
    STATE.apiKey = '';
    localStorage.removeItem('elevenlabs_api_key');
    updateApiUI();
    closeModal();
    showToast('Demo Mode enabled (Uses browser speech fallback)', 'info');
  });

  // Keyboard shortcut: Cmd/Ctrl + Enter to trigger generation
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      dom.generatePlayBtn.click();
    }
  });

  window.addEventListener('resize', resizeCanvas);
}

// --- Initialization ---
function init() {
  // Restore saved selections
  if (STATE.selectedModel) dom.modelSelect.value = STATE.selectedModel;
  if (STATE.selectedVoice) dom.voiceSelect.value = STATE.selectedVoice;
  if (STATE.outputFormat && dom.outputFormatSelect) dom.outputFormatSelect.value = STATE.outputFormat;

  // Restore slider values
  dom.stabilitySlider.value = STATE.settings.stability;
  dom.stabilityVal.textContent = STATE.settings.stability.toFixed(2);
  dom.similaritySlider.value = STATE.settings.similarity_boost;
  dom.similarityVal.textContent = STATE.settings.similarity_boost.toFixed(2);
  dom.styleSlider.value = STATE.settings.style;
  dom.styleVal.textContent = STATE.settings.style.toFixed(2);
  dom.speakerBoostToggle.checked = STATE.settings.use_speaker_boost;

  // Set default sample text
  dom.textInput.value = PRESETS.audiobook;
  dom.charCount.textContent = dom.textInput.value.length;
  dom.wordCount.textContent = dom.textInput.value.trim().split(/\s+/).length;

  setupEventListeners();
  updateApiUI();
  renderHistory();
  resizeCanvas();
  drawVisualizer();

  // If user already has an API key stored, try auto-syncing voices
  if (STATE.apiKey) {
    fetchAccountVoices();
  }
}

// Boot application
document.addEventListener('DOMContentLoaded', init);

import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import { marked } from 'marked';

// UI Elements
const chatContainer = document.getElementById('chatContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelector = document.getElementById('modelSelector');
const newChatBtn = document.getElementById('newChatBtn');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

let currentHistory = [];

// Initialize
async function init() {
  await loadSettings();
  setupEventListeners();
}

async function loadSettings() {
  const { value: claude } = await Preferences.get({ key: 'keyClaude' });
  const { value: groq } = await Preferences.get({ key: 'keyGroq' });
  const { value: gemini } = await Preferences.get({ key: 'keyGemini' });

  if (claude) document.getElementById('keyClaude').value = claude;
  if (groq) document.getElementById('keyGroq').value = groq;
  if (gemini) document.getElementById('keyGemini').value = gemini;

  const { value: model } = await Preferences.get({ key: 'selectedModel' });
  if (model) modelSelector.value = model;
}

function setupEventListeners() {
  // Mobile Menu
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Settings
  settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
  cancelSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
  saveSettingsBtn.addEventListener('click', async () => {
    await Preferences.set({ key: 'keyClaude', value: document.getElementById('keyClaude').value.trim() });
    await Preferences.set({ key: 'keyGroq', value: document.getElementById('keyGroq').value.trim() });
    await Preferences.set({ key: 'keyGemini', value: document.getElementById('keyGemini').value.trim() });
    settingsModal.classList.remove('active');
  });

  modelSelector.addEventListener('change', async (e) => {
    await Preferences.set({ key: 'selectedModel', value: e.target.value });
  });

  // Chat
  promptInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  newChatBtn.addEventListener('click', () => {
    currentHistory = [];
    chatContainer.innerHTML = '';
    chatContainer.appendChild(welcomeScreen);
    welcomeScreen.style.display = 'block';
    if(window.innerWidth <= 768) sidebar.classList.remove('open');
  });
}

function addMessage(role, content) {
  if (welcomeScreen.style.display !== 'none') {
    welcomeScreen.style.display = 'none';
  }

  const div = document.createElement('div');
  div.className = 'message';

  const htmlContent = marked.parse(content);

  div.innerHTML = `
    <div class="avatar ${role === 'user' ? 'user' : 'ai'}">${role === 'user' ? 'U' : '✨'}</div>
    <div class="content">${htmlContent}</div>
  `;

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="avatar ai">✨</div>
    <div class="content">
      <div class="typing">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}

async function handleSend() {
  const text = promptInput.value.trim();
  if (!text) return;

  promptInput.value = '';
  promptInput.style.height = 'auto';
  promptInput.disabled = true;
  sendBtn.disabled = true;

  addMessage('user', text);
  currentHistory.push({ role: 'user', content: text });

  const indicator = addTypingIndicator();

  try {
    const response = await fetchAIResponse(text);
    indicator.remove();
    addMessage('ai', response);
    currentHistory.push({ role: 'assistant', content: response });
  } catch (err) {
    indicator.remove();
    addMessage('ai', '⚠️ Erreur: ' + err.message);
  } finally {
    promptInput.disabled = false;
    sendBtn.disabled = false;
    promptInput.focus();
  }
}

async function fetchAIResponse(prompt) {
  const model = modelSelector.value;

  if (model === 'claude') return await callClaude();
  if (model === 'groq') return await callGroq();
  if (model === 'gemini') return await callGemini();

  throw new Error("Modèle non sélectionné");
}

async function callClaude() {
  const { value: key } = await Preferences.get({ key: 'keyClaude' });
  if (!key) throw new Error("Clé API Claude manquante dans les paramètres.");

  const systemPrompt = "Tu es Smile AI, un assistant intelligent. Réponds en français de manière claire et concise.";

  const response = await CapacitorHttp.post({
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    data: {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: systemPrompt,
      messages: currentHistory.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    }
  });

  if (response.status !== 200) throw new Error(response.data?.error?.message || "Erreur API");
  return response.data.content[0].text;
}

async function callGroq() {
  const { value: key } = await Preferences.get({ key: 'keyGroq' });
  if (!key) throw new Error("Clé API Groq manquante dans les paramètres.");

  const systemPrompt = { role: 'system', content: "Tu es Smile AI. Réponds en français." };

  const messages = [systemPrompt, ...currentHistory];

  const response = await CapacitorHttp.post({
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    data: {
      model: 'llama3-70b-8192',
      messages: messages
    }
  });

  if (response.status !== 200) throw new Error(response.data?.error?.message || "Erreur API");
  return response.data.choices[0].message.content;
}

async function callGemini() {
  const { value: key } = await Preferences.get({ key: 'keyGemini' });
  if (!key) throw new Error("Clé API Gemini manquante dans les paramètres.");

  const historyForGemini = currentHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await CapacitorHttp.post({
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${key}`,
    headers: { 'Content-Type': 'application/json' },
    data: {
      contents: historyForGemini
    }
  });

  if (response.status !== 200) throw new Error(response.data?.error?.message || "Erreur API");
  return response.data.candidates[0].content.parts[0].text;
}

document.addEventListener('DOMContentLoaded', init);

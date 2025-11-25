window.onload = () => {
  // -------------------- Global preview file path (uploaded PPT image) --------------------
  // dev note: local file path provided for quick preview usage if needed
  const PRESENTATION_PREVIEW = "/mnt/data/A_PowerPoint_presentation_slide_showcases_MoodRoom.png";

  // -------------------- Elements --------------------
  const emojis = document.querySelectorAll('#emoji-container .emoji');
  const startBtn = document.getElementById('start-btn');
  const welcomeSection = document.getElementById('welcome-section');
  const welTxt = document.getElementById('wel-txt');
  const promptBox = document.getElementById('prompt-box');
  const submitBtn = document.getElementById('submit-btn');
  const inputField = promptBox.querySelector('input');

  const voiceBtn = document.getElementById('voice-btn');
  const voicePopup = document.getElementById('voice-popup');
  const recognizedText = document.getElementById('recognized-text');
  const restartBtn = document.getElementById('restart-btn');
  const useTextBtn = document.getElementById('use-text-btn');

  const resultSection = document.getElementById('result-section');
  const resultText = document.getElementById('result-text');
  const resultEmoji = document.getElementById('result-emoji');
  const tryAgainBtn = document.getElementById('try-again-btn');

  // Chat Elements
  const chatSection = document.getElementById('chat-section');
  const chatIcon = document.getElementById('chat-icon');
  const chatBackBtn = document.getElementById('chat-back-btn');
  const chatHomeBtn = document.getElementById('chat-home-btn');

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  const gamesBtn = document.getElementById("games-floating-btn");

  let mediaRecorder, audioChunks = [];

  // -------------------- Globals for detected values --------------------
  let globalDetectedText = "";
  let globalEmotion = "";

  // For typing dots animation setInterval handle
  let typingIntervalHandle = null;

  // -------------------- Emoji Animation --------------------
  emojis.forEach((emoji, i) => {
    setTimeout(() => {
      emoji.style.opacity = 1;
      emoji.classList.add('bounce-in');
    }, i * 300);
  });

  // -------------------- Start Button --------------------
  startBtn.addEventListener('click', () => {
    welTxt.style.opacity = 0;
    welTxt.style.transform = 'scale(0.9)';

    const finalPositions = [
      { top: '8%', left: '10%' }, { top: '12%', left: '45%' }, { top: '10%', left: '80%' },
      { top: '28%', left: '70%' }, { top: '40%', left: '5%' }, { top: '60%', left: '25%' },
      { top: '45%', left: '85%' }, { top: '62%', left: '75%' }, { top: '75%', left: '50%' },
      { top: '80%', left: '15%' }, { top: '85%', left: '85%' }, { top: '25%', left: '26%' }
    ];

    emojis.forEach((emoji, i) => {
      emoji.style.transition = 'top 1.2s ease, left 1.2s ease';
      emoji.style.top = finalPositions[i].top;
      emoji.style.left = finalPositions[i].left;
      emoji.classList.add('float');
    });

    setTimeout(() => {
      promptBox.style.pointerEvents = 'auto';
      promptBox.classList.remove('opacity-0');
      promptBox.classList.add('transition-opacity', 'duration-1000', 'opacity-100');
      inputField.focus();
    }, 1200);
  });

  function createSphere() {
    const sphere = document.createElement("div");
    sphere.classList.add("sphere");

    const size = Math.random() * 120 + 60; // 60–180px
    sphere.style.width = sphere.style.height = size + "px";

    const colors = [
      "rgba(255,130,255,0.395)",
      "rgba(149,120,255,0.436)",
      "rgba(255,199,140,0.402)",
      "rgba(120,219,255,0.463)"
    ];
    sphere.style.background = colors[Math.floor(Math.random() * colors.length)];

    sphere.style.left = Math.random() * window.innerWidth + "px";
    sphere.style.top = Math.random() * window.innerHeight + "px";
    sphere.style.animationDuration = (10 + Math.random() * 5) + "s";

    document.getElementById("sphere-container").appendChild(sphere);

    setTimeout(() => { sphere.remove(); }, 15000);
  }

  // Continuous creation
  setInterval(createSphere, 700);

  // -------------------- Voice Input --------------------
  voiceBtn.addEventListener('click', async () => {
    voicePopup.classList.remove('hidden');
    recognizedText.innerText = "Listening... 🎙️";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        recognizedText.innerText = "Processing voice...";
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append("file", blob, "speech.wav");

        try {
          const res = await fetch("http://localhost:5000/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.text) recognizedText.innerText = data.text;
          else recognizedText.innerText = "Could not recognize speech 😞";
        } catch (err) {
          recognizedText.innerText = "Error processing audio!";
          console.error(err);
        }
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach((t) => t.stop());
      }, 8000);
    } catch (err) {
      alert("Microphone access denied or not available!");
      console.error(err);
    }
  });

  restartBtn.addEventListener('click', () => {
    voicePopup.classList.add('hidden');
    voiceBtn.click();
  });

  useTextBtn.addEventListener('click', () => {
    const text = recognizedText.innerText.trim();
    if (text && !text.startsWith("Could not")) inputField.value = text;
    voicePopup.classList.add('hidden');
  });

  // -------------------- Helper: small UI utility --------------------
  function setButtonLoading(btn, isLoading, textWhenDone = "Submit") {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.origText = btn.innerText;
      btn.innerText = "Analyzing...";
    } else {
      btn.innerText = textWhenDone;
    }
  }

  // -------------------- Mood Detection & Result --------------------
  async function handleDetectEmotion() {
    const moodText = inputField.value.trim();
    if (!moodText) {
      alert('Please enter or speak something first!');
      return;
    }

    setButtonLoading(submitBtn, true, "Submit");

    try {
      const res = await fetch('http://localhost:5000/detect-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: moodText })
      });
      const data = await res.json();

      // store globally for chat usage
      globalDetectedText = moodText;
      globalEmotion = (data.emotion ? data.emotion.toLowerCase() : 'neutral');

      const emotion = globalEmotion;

      // get suggestion (optional)
      let suggestionText = "Thinking of something nice for you...";
      try {
        const suggestionRes = await fetch('http://localhost:5000/get-suggestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: moodText, emotion })
        });
        const suggestionData = await suggestionRes.json();
        suggestionText = suggestionData.suggestion || "Keep smiling — you're doing great 🌼";
      } catch (err) {
        suggestionText = "Keep smiling — you're doing great 🌼";
      }

      const emojiMap = {
        admiration: "🤩", amusement: "😮", anger: "😡", annoyance: "😫",
        approval: "💯", confusion: "😵‍💫", caring: "😌", curosity: "😶‍🌫️",
        disgust: "🤮", disappointment: "😞", embarressment: "🫠", excitement: "🥳",
        fear: "😨", gratitude: "🙇🏻‍♀️", joy: "😄", pride: "😎", sadness: "😢",
        love: "❤️", surprise: "😲", neutral: "🙂", default: "😳"
      };

      resultText.innerHTML = `
        <p>Your text: "${moodText}"</p>
        <p>Detected mood: <strong>${emotion}</strong></p>
        <p style="margin-top:10px; font-style: italic; color:#6b7280;">${suggestionText}</p>
      `;
      resultEmoji.innerText = emojiMap[emotion] || emojiMap.default;

      applyTheme(emotion);

      // Show result
      promptBox.style.display = 'none';
      welcomeSection.style.display = 'none';
      resultSection.style.display = 'flex';
      chatIcon.style.display = 'block';

      resultSection.style.opacity = 0;
      resultSection.style.transform = 'translateY(30px)';
      resultSection.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      setTimeout(() => {
        resultSection.style.opacity = 1;
        resultSection.style.transform = 'translateY(0)';
      }, 50);

      // focus chat input so user can chat immediately
      setTimeout(() => {
        if (chatSection.style.display === 'flex') chatInput.focus();
      }, 500);

    } catch (err) {
      console.error('Emotion detection failed:', err);
      alert('Error detecting emotion. Please try again.');
    } finally {
      setButtonLoading(submitBtn, false, "Submit");
    }
  }

  // Detect on submit click
  submitBtn.addEventListener('click', handleDetectEmotion);

  // -------------------- Enter-to-Detect Emotion --------------------
  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDetectEmotion();
    }
  });

  // -------------------- Try Again --------------------
  tryAgainBtn.addEventListener('click', () => {
    document.querySelectorAll(".theme-bg").forEach(el => el.remove());
    document.getElementById("emoji-container").classList.remove("hidden");

    resultSection.style.opacity = 0;
    resultSection.style.transform = 'translateY(30px)';
    setTimeout(() => {
      resultSection.style.display = 'none';
      chatIcon.style.display = 'none';
      promptBox.style.display = 'flex';
      welcomeSection.style.display = 'block';
      inputField.value = '';
      inputField.focus();
    }, 400);
  });

  // -------------------- Chat Toggles --------------------
  function openChat() {
    resultSection.style.display = 'none';
    chatSection.style.display = 'flex';
    chatIcon.style.display = 'none';
    chatInput.focus();
  }

  function backToResult() {
    chatSection.style.display = 'none';
    resultSection.style.display = 'flex';
    chatIcon.style.display = 'block';
  }

  chatIcon.addEventListener('click', openChat);
  chatBackBtn.addEventListener('click', backToResult);
  chatHomeBtn.addEventListener('click', () => location.reload());

  // -------------------- Theme Loader --------------------
  function applyTheme(emotion) {
    const themes = {
      admiration: "theme/admiration.html", annoyance: "theme/annoyance.html",
      curiosity: "theme/curious.html", joy: "theme/happy.html", sadness: "theme/sad.html",
      anger: "theme/anger.html", love: "theme/love.html", caring: "theme/caring.html",
      remorse: "theme/sad.html", surprise: "theme/surprise.html", excitement: "theme/exited.html",
      fear: "theme/fear.html", neutral: "theme/neutral.html", nervousness: "theme/nervousness.html",
      embarrassment: "theme/embarss.html", gratitude: "theme/caring.html", pride: "theme/surprise.html",
      amusement: "theme/exited.html", disgust: "theme/disgust.html", desire: "theme/desire.html",
      approval: "theme/desire.html", disapproval: "theme/disapprov.html", disappointment: "theme/disapprov.html",
      confusion: "theme/confuse.html"
    };

    const file = themes[emotion] || themes.neutral;
    document.getElementById("emoji-container").classList.add("hidden");
    document.querySelectorAll(".theme-bg").forEach(el => el.remove());

    fetch(file)
      .then(res => res.text())
      .then(html => {
        const wrapper = document.createElement("div");
        wrapper.className = "absolute inset-0 theme-bg -z-10 pointer-events-none";
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        wrapper.querySelectorAll("script").forEach(oldScript => {
          const newScript = document.createElement("script");
          newScript.textContent = oldScript.textContent;
          document.body.appendChild(newScript);
        });

        if (typeof startTheme === "function") startTheme();
      })
      .catch(err => console.error("Theme load error:", err));
  }

  // -------------------- CHAT SYSTEM WITH OPENAI BACKEND --------------------

  // Add message (user → right, AI → left) with animation classes
  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add("w-full", "my-2", "flex", "fade-in");

    if (sender === "user") {
      msg.classList.add("justify-end");
      msg.innerHTML = `
        <div class="max-w-[70%] bg-indigo-500 text-white px-4 py-2 rounded-xl rounded-br-none shadow-md scale-in">
          ${escapeHtml(text)}
        </div>`;
    } else {
      msg.classList.add("justify-start");
      msg.innerHTML = `
        <div class="max-w-[70%] bg-black/20 backdrop-blur-md text-white px-4 py-2 rounded-xl rounded-bl-none shadow-md scale-in">
          ${escapeHtml(text)}
        </div>`;
    }

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Sanitize simple HTML in messages to avoid injection
  function escapeHtml(unsafe) {
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------------------- Typing indicator --------------------
  function showTyping() {
    // don't duplicate typing bubble
    if (document.getElementById("typing-bubble")) return;

    const typingBubble = document.createElement("div");
    typingBubble.id = "typing-bubble";
    typingBubble.classList.add("w-full", "my-2", "flex", "justify-start");

    typingBubble.innerHTML = `
      <div class="max-w-[40%] bg-black/20 backdrop-blur-md text-white px-4 py-2 rounded-xl rounded-bl-none shadow-md typing-bubble">
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
        <span class="typing-dot">●</span>
      </div>
    `;

    chatMessages.appendChild(typingBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // animate dots via JS (fallback if CSS not present)
    const dots = typingBubble.querySelectorAll('.typing-dot');
    let i = 0;
    typingIntervalHandle = setInterval(() => {
      dots.forEach((d, idx) => d.style.opacity = (idx === i ? '1' : '0.25'));
      i = (i + 1) % dots.length;
    }, 350);
  }

  function hideTyping() {
    const el = document.getElementById("typing-bubble");
    if (el) el.remove();
    if (typingIntervalHandle) {
      clearInterval(typingIntervalHandle);
      typingIntervalHandle = null;
    }
  }

  // -------------------- Chat Send Handler (sends message + previous text + emotion) --------------------
  chatSend.addEventListener("click", async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage("user", message);
    chatInput.value = "";

    // show typing indicator
    showTyping();

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          previousText: globalDetectedText,
          emotion: globalEmotion
        }),
      });

      const data = await res.json();

      // simulate AI thinking time for realism
      setTimeout(() => {
        hideTyping();
        addMessage("ai", data.reply || "No response");
      }, 650); // ~650ms delay

    } catch (err) {
      hideTyping();
      console.error(err);
      addMessage("ai", "⚠️ Error connecting to AI server.");
    }
  });

  // -------------------- Enter-to-send chat message --------------------
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      chatSend.click();
    }
  });

  // -------------------- Games button --------------------
  gamesBtn.addEventListener("click", () => {
    window.location.href = "games.html"; // change to your actual games page
  });

  // -------------------- Helpful debug: click to preview PPT image (optional) --------------------
  // you can remove this later. It's useful to quickly view the generated PPT preview image.
  const previewBtn = document.getElementById("preview-ppt-btn");
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      // opens a new tab to preview the generated PPT image from local path
      window.open(PRESENTATION_PREVIEW, "_blank");
    });
  }

  // -------------------- End of onload -------------------- 
};

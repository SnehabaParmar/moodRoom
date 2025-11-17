window.onload = () => {
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

  let mediaRecorder, audioChunks = [];

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
    }, 1200);
  });

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
        mediaRecorder.stop();
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

  // -------------------- Mood Detection & Result --------------------
  submitBtn.addEventListener('click', async () => {
    const moodText = inputField.value.trim();
    if (!moodText) {
      alert('Please enter or speak something first!');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Analyzing...';

    try {
      const res = await fetch('http://localhost:5000/detect-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: moodText })
      });
      const data = await res.json();
      const emotion = data.emotion ? data.emotion.toLowerCase() : 'neutral';

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

    } catch (err) {
      console.error('Emotion detection failed:', err);
      alert('Error detecting emotion. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit';
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
      admiration: "theme/admiration.html", annoyance: "theme/anger.html",
      curiosity: "theme/curious.html", joy: "theme/happy.html", sadness: "theme/sad.html",
      anger: "theme/anger.html", love: "theme/love.html", calm: "theme/calm.html",
      relif: "theme/calm.html", surprise: "theme/surprise.html", excitement: "theme/exited.html",
      fear: "theme/fear.html", neutral: "theme/neutral.html"
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

  // Add message (user → right, AI → left)
  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add("w-full", "my-2", "flex");

    if (sender === "user") {
      msg.classList.add("justify-end");
      msg.innerHTML = `
        <div class="max-w-[70%] bg-indigo-500 text-white px-4 py-2 rounded-xl rounded-br-none">
          ${text}
        </div>`;
    } else {
      msg.classList.add("justify-start");
      msg.innerHTML = `
        <div class="max-w-[70%] bg-black/20 backdrop-blur-md text-white px-4 py-2 rounded-xl rounded-bl-none">
          ${text}
        </div>`;
    }

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Send message to Flask backend
  chatSend.addEventListener("click", async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage("user", message);
    chatInput.value = "";

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      addMessage("ai", data.reply || "No response");
    } catch (err) {
      console.error(err);
      addMessage("ai", "⚠️ Error connecting to AI server.");
    }
  });

  const gamesBtn = document.getElementById("games-floating-btn");

  gamesBtn.addEventListener("click", () => {
    window.location.href = "games.html  "; // change to your actual games page
  });

};

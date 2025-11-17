const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotContainer = document.getElementById('chatbot-container');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');

// Toggle chatbot window
chatbotToggle.addEventListener('click', () => {
  chatbotContainer.style.display = chatbotContainer.style.display === 'flex' ? 'none' : 'flex';
  chatbotContainer.style.flexDirection = 'column';
});

// Simple AI response logic (replace with OpenAI API later)
function getAIResponse(userMsg) {
  const responses = [
    "Hmm, tell me more about that...",
    "I see! How does that make you feel?",
    "Interesting… 🤔",
    "Can you elaborate a bit?",
    "Oh! That’s something to think about."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Send message function
function sendMessage() {
  const msg = chatbotInput.value.trim();
  if (!msg) return;

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.textContent = `You: ${msg}`;
  userDiv.style.alignSelf = 'flex-end';
  userDiv.style.background = 'rgba(255,255,255,0.2)';
  userDiv.style.padding = '6px 10px';
  userDiv.style.borderRadius = '8px';
  chatbotMessages.appendChild(userDiv);

  // Clear input
  chatbotInput.value = '';

  // Add AI response after slight delay
  setTimeout(() => {
    const aiDiv = document.createElement('div');
    aiDiv.textContent = `AI: ${getAIResponse(msg)}`;
    aiDiv.style.alignSelf = 'flex-start';
    aiDiv.style.background = 'rgba(255,255,255,0.1)';
    aiDiv.style.padding = '6px 10px';
    aiDiv.style.borderRadius = '8px';
    chatbotMessages.appendChild(aiDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }, 700);
}

// Event listeners
chatbotSend.addEventListener('click', sendMessage);
chatbotInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

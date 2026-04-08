import axios from 'axios';
import readline from 'readline/promises';

const BASE_URL = 'http://localhost:3000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let accessToken = '';

async function login() {
  console.log('\n=== Login ===');
  const username = await rl.question('Username: ');
  const password = await rl.question('Password: ');

  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, { username, password });
    accessToken = res.data.accessToken;
    console.log('✅ Login successful!');
    return true;
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function signup() {
  console.log('\n=== Signup ===');
  const username = await rl.question('Username: ');
  const nickname = await rl.question('Nickname: ');
  const password = await rl.question('Password (min 6 chars): ');

  try {
    const res = await axios.post(`${BASE_URL}/auth/signup`, { username, nickname, password });
    accessToken = res.data.accessToken;
    console.log('✅ Signup successful! Logged in as:', res.data.user.nickname);
    return true;
  } catch (err) {
    console.error('❌ Signup failed:', err.response?.data?.message || err.message);
    return false;
  }
}

const api = {
  get: (url, config = {}) =>
    axios.get(`${BASE_URL}${url}`, {
      ...config,
      headers: { Authorization: `Bearer ${accessToken}`, ...config.headers },
    }),
  post: (url, data, config = {}) =>
    axios.post(`${BASE_URL}${url}`, data, {
      ...config,
      headers: { Authorization: `Bearer ${accessToken}`, ...config.headers },
    }),
};

async function newChat() {
  console.log('\n--- New Chat ---');
  try {
    const res = await api.post('/sessions', {});
    const sessionId = res.data.session_id;
    console.log(`\nSession started: ${sessionId}`);
    console.log('AI:', res.data.question);

    while (true) {
      const msg = await rl.question('\nYou: ');
      if (['exit', 'quit'].includes(msg.toLowerCase())) break;

      const chatRes = await api.post(`/sessions/${sessionId}/messages`, { message: msg });
      console.log('AI:', chatRes.data.response);

      if (chatRes.data.diary) {
        console.log('\n📘 Diary detected:');
        console.log(chatRes.data.diary);
        break;
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.response?.data?.message || err.message);
  }
}

async function getOllamaResponse(messages) {
  try {
    const res = await axios.post('http://localhost:11434/api/chat', {
      model: 'gemma3:4b',
      messages,
      stream: false,
    });
    return res.data.message.content;
  } catch (err) {
    return "I'm just really overwhelmed with university right now, I can't even think straight...";
  }
}

async function newChatAuto() {
  console.log('\n--- New Chat (Automatic Response) ---');
  console.log('🤖 Character: Noth (19, Student)');

  const ollamaMessages = [
    {
      role: 'system',
      content: `You are Noth, 19, a first year university student, often stressed about work and can barely keep up with the workload. Noth wants to vent his emotions without being a bother to friends and family. He finds diary writing to be difficult and wants an easier option. He already uses AI chatbots like ChatGPT daily.
Respond to the AI companion naturally and briefly (1-2 sentences). Stay in character.`,
    },
  ];

  try {
    const res = await api.post('/sessions', {});
    const sessionId = res.data.session_id;
    console.log(`\nSession started: ${sessionId}`);

    let aiQuestion = res.data.question;
    console.log('AI:', aiQuestion);

    while (true) {
      ollamaMessages.push({ role: 'user', content: aiQuestion });

      const jashMsg = await getOllamaResponse(ollamaMessages);
      console.log('Jash (Auto):', jashMsg);
      ollamaMessages.push({ role: 'assistant', content: jashMsg });

      const chatRes = await api.post(`/sessions/${sessionId}/messages`, { message: jashMsg });
      aiQuestion = chatRes.data.response;
      console.log('AI:', aiQuestion);

      if (chatRes.data.diary) {
        console.log('\n📘 Diary detected:');
        console.log(chatRes.data.diary);
        break;
      }

      // Delay for readability
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error('❌ Error:', err.response?.data?.message || err.message);
  }
}

async function chatHistory() {
  console.log('\n--- Chat History ---');
  try {
    const res = await api.get('/sessions');
    const sessions = res.data.sessions;

    if (!sessions.length) {
      console.log('No sessions found.');
      return;
    }

    sessions.forEach((s, i) => console.log(`${i + 1}. ${s.session_id} (${s.status})`));
    const choiceStr = await rl.question('\nSelect session #: ');
    const choice = parseInt(choiceStr) - 1;
    const sessionId = sessions[choice]?.session_id;

    if (!sessionId) return console.log('Invalid selection.');

    const msgRes = await api.get(`/sessions/${sessionId}/messages`);
    console.log('\n--- Messages ---');
    msgRes.data.messages.forEach((m) => {
      const role = m.role === 'user' ? 'You' : 'AI';
      console.log(`${role}: ${m.content}`);
    });
  } catch (err) {
    console.error('❌ Error:', err.response?.data?.message || err.message);
  }
}

async function diaryMenu() {
  console.log('\n--- Diary ---');
  try {
    const res = await api.get('/sessions');
    const sessions = res.data.sessions;

    if (!sessions.length) {
      console.log('No sessions available.');
      return;
    }

    sessions.forEach((s, i) => console.log(`${i + 1}. ${s.start_timestamp} (${s.status})`));
    const choiceStr = await rl.question('\nSession #: ');
    const choice = parseInt(choiceStr) - 1;
    const sessionId = sessions[choice]?.session_id;

    if (!sessionId) return console.log('Invalid selection.');

    const diaryRes = await api.get(`/diary/user/diary`, { params: { id: sessionId } });
    const { diary, date } = diaryRes.data;

    console.log('\n--- Diary Entry ---');
    if (!diary) {
      console.log('No diary found for this session.');
    } else {
      if (date) console.log(`Date: ${date}`);
      console.log('\nContent:');
      console.log(diary);
    }
  } catch (err) {
    console.error('❌ Error:', err.response?.data?.message || err.message);
  }
}

async function main() {
  console.log('=== Vently CLI ===');

  let authenticated = false;
  while (!authenticated) {
    console.log('\n1. Login');
    console.log('2. Signup');
    console.log('3. Exit');
    const authChoice = await rl.question('\nSelect: ');

    if (authChoice === '1') authenticated = await login();
    else if (authChoice === '2') authenticated = await signup();
    else if (authChoice === '3') process.exit(0);
    else console.log('Invalid choice');
  }

  while (true) {
    console.log('\n--- Main Menu ---');
    console.log('1. New chat');
    console.log('1.1. New chat (Automatic Response)');
    console.log('2. Chat history');
    console.log('3. Diary');
    console.log('4. Logout & Exit');

    const choice = await rl.question('\nSelect: ');
    if (choice === '1') await newChat();
    else if (choice === '1.1') await newChatAuto();
    else if (choice === '2') await chatHistory();
    else if (choice === '3') await diaryMenu();
    else if (choice === '4') break;
    else console.log('Invalid choice');
  }
  rl.close();
}

main();

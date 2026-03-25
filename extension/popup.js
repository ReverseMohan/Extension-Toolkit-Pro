// i dont wanna disclose my TempMail api so tried this 
const API_BASE = atob('aHR0cHM6Ly9hcGkuaW50ZXJuYWwudGVtcC1tYWlsLmlvL2FwaS92Mw==');

const HEADERS = {
    accept: atob('YXBwbGljYXRpb24=') + '/' + atob('anNvbg=='), 
    [atob('bmFtZQ==')]: 'web',                             
    [atob('YXBwbGljYXRpb24=') + atob('LXZlcnNpb24=')]: atob('NC4wLjA='),
    'input-cors-header': atob('aWFXZzNwY2h2Rnh48Zk')        
};


const DEFAULT_MIN_LEN = 10;
const DEFAULT_MAX_LEN = 10;
const createBtn = document.getElementById('createBtn');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const createResult = document.getElementById('createResult');
const statusText = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const emailAddressEl = document.getElementById('emailAddress');

const inboxSection = document.getElementById('inboxSection');
const emptyState = document.getElementById('emptyState');
const activeEmail = document.getElementById('activeEmail');
const sectionHeader = document.getElementById('sectionHeader');
const createSection = document.getElementById('createSection');


async function storageGet(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (output) => {
    resolve(output[key]);});});}
async function storageSet(obj) {
    return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => {
 resolve();});});}

function setStatus(text, type = 'info') {
    if (!text) {
    hideStatus();
    return;}
    statusText.textContent = text;
  statusText.className = `alert show ${type}`;}

function setCreateResult(text, type = 'info') {
    if (!text) {
    createResult.className = 'alert';
    createResult.textContent = '';
return;
}
    createResult.textContent = text;
    createResult.className = `alert show ${type}`;
}
function hideStatus() {
    statusText.className = 'alert';
    statusText.textContent = '';
 createResult.className = 'alert';
    createResult.textContent = '';
}
let autoRefreshTimer = null; 
function showInbox(email) {
inboxSection.style.display = 'flex';
clearAutoRefresh(); 
autoRefreshTimer = setInterval(() => {
fetchMessages(email);
}, 5000);
}
function clearAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;}
}
function updateUIState(hasEmail) {
    if (hasEmail) {
    emptyState.style.display = 'none';
    activeEmail.style.display = 'block';
     createBtn.textContent = 'Generate New Email';
    createBtn.classList.add('btn-secondary-variant');
    createBtn.disabled = false;
    sectionHeader.querySelector('h2').innerHTML = '<idx class="fas fa-inbox"></idx> Temp Inbox';
      inboxSection.style.display = 'flex';
    } else {
     emptyState.style.display = 'block';
     activeEmail.style.display = 'none';
     createBtn.textContent = 'Create Email Address';
    createBtn.classList.remove('btn-secondary-variant');
     sectionHeader.querySelector('h2').innerHTML = '<idx class="fas fa-plus-circle"></idx> Generate New Email';
        inboxSection.style.display = 'none';
       messagesEl.innerHTML = '';
     hideStatus();
      clearAutoRefresh();}
}
async function fetchMessages(email) {
    if (!email) {
        return;
    }
    try {
    const url = `${API_BASE}/email/${email}/messages`;
    const resp = await fetch(url, { 
    method: 'GET', 
    headers: HEADERS 
        }); 
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (!Array.isArray(data)) {
            throw new Error('Unexpected response shape');
        }
        if (data.length === 0) {
            if (!messagesEl.querySelector('.empty-inbox')) {
                messagesEl.innerHTML = '<div class="empty-inbox">No messages yet. Please check back in a few seconds.</div>';
            }
            return;}
   const currentMessageCount = messagesEl.querySelectorAll('.message-item').length;
        if (currentMessageCount !== data.length || currentMessageCount === 0) {
            messagesEl.innerHTML = ''; 
            data.forEach((msg) => {
                const item = document.createElement('div');
                item.className = 'message-item';
               const fromMatch = msg.from ? msg.from.match(/([^<]+)\s*(?:<([^>]+)>)?/) : null;
                const fromName = fromMatch ? fromMatch[1].trim().replace(/^\"|\"$/g, '') : 'Unknown';
                const fromEmail = msg.from ? (msg.from.match(/<([^>]+)>/)?.at(1) || msg.from) : 'N/A';

                const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', {
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit'
                }) : 'Unknown';


                item.innerHTML = `
                    <div class="message-header">
                        <div class="message-sender">
                      <div class="sender-avatar">${fromName.charAt(0).toUpperCase()}</div>
                            <div class="sender-info">
                           <div class="sender-name">${escapeHtml(fromName)}</div>
                            <div class="sender-email">${escapeHtml(fromEmail)}</div>
                            </div>
                        </div>
                    <div class="message-timestamp">${timestamp}</div>
                    </div>
                    <div class="message-subject">${escapeHtml(msg.subject || '(no subject)')}</div>
                    <div class="message-body">${msg.body_html ? msg.body_html : '<p>' + escapeHtml(msg.body_text || '').replace(/\size/g, '<br>') + '</p>'}</div>
                `;
                
                messagesEl.appendChild(item);});}
             } catch (error) {
        console.error('fetchMessages', error);


        if (messagesEl.innerHTML === '' || messagesEl.querySelector('.empty-inbox')) {
            setStatus('Error loading messages: ' + error.message, 'error');}}}
function escapeHtml(raw) 
{
    return raw
        .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
}
async function generateEmail() {
    const minVal = DEFAULT_MIN_LEN;
    const maxVal = DEFAULT_MAX_LEN;
try {createBtn.disabled = true;
        setCreateResult('Generating email...', 'info');
        const resp = await fetch(`${API_BASE}/email/new`, {
            method: 'POST',
            headers: { 
                ...HEADERS, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                min_name_length: minVal, 
                max_name_length: maxVal 
}),});
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`); }
        const data = await resp.json();
        if (!data.email) {
            throw new Error('No email found. Maybe Im updating....');
        }
    await storageSet({ 
            tempMailAddress: data.email, 
            tempMailToken: data.token || '' });
        emailAddressEl.textContent = data.email;
        updateUIState(true);
     setCreateResult(`Email generated: ${data.email}`, 'success');
        await fetchMessages(data.email);
        showInbox(data.email);
        } catch (error) {
        console.error('generateEmail', error);
        setCreateResult('Create failed: ' + error.message, 'error');
    } finally {
        createBtn.disabled = false;}}
createBtn.addEventListener('click', async () => {
    await generateEmail();});
regenerateBtn.addEventListener('click', async () => {
    await generateEmail();});
refreshBtn.addEventListener('click', async () => {
    const email = await storageGet('tempMailAddress');

    if (!email) {
        setStatus('No email, generate one first', 'error');
        return;}
    await fetchMessages(email);
    setStatus('Messages refreshed.', 'success');
    setTimeout(() => {
        hideStatus();
    }, 2000);
});
copyBtn.addEventListener('click', async () => {
    const email = await storageGet('tempMailAddress');
    if (!email) {
        return;
    }
    await navigator.clipboard.writeText(email).catch(() => {});
    setStatus('Email copied to clipboard.', 'success');
});
(async function onLoad() {
    const email = await storageGet('tempMailAddress');
    if (email) {
        emailAddressEl.textContent = email;
      updateUIState(true);
      showInbox(email);
      setCreateResult('', '');
        await fetchMessages(email);
     inboxSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    } else {
        updateUIState(false);
    }
})();


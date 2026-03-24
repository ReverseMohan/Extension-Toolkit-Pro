
const API_BASE = 'https://api.internal.temp-mail.io/api/v3';
const HEADERS = {
    accept: 'application/json',
    'application-name': 'web',
    'application-version': '4.0.0',
    'input-cors-header': 'iaWg3pchvFx48fY'
};


const DEFAULT_MIN_LEN = 10;
const DEFAULT_MAX_LEN = 10;

// easy to access (dom)
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

// function to get info from Chrome storage
async function storageGet(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (output) => {
            resolve(output[key]);
        });
    });
}

//  save to Chrome storage
async function storageSet(obj) {
    return new Promise((resolve) => {
        chrome.storage.local.set(obj, () => {
            resolve();
        });
    });
}


function setStatus(text, type = 'info') {
    if (!text) {
        hideStatus();
        return;
    }
    statusText.textContent = text;
    statusText.className = `alert show ${type}`;
}

// new email alert
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
// inbox show & auto-refresh
function showInbox(email) {
    inboxSection.style.display = 'flex';
    clearAutoRefresh(); 
    

    autoRefreshTimer = setInterval(() => {
        fetchMessages(email);
    }, 10000);
}

function clearAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
}

// dynamic ui if active email
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
        // empty (if there is no email)
        emptyState.style.display = 'block';
        activeEmail.style.display = 'none';
        createBtn.textContent = 'Create Email Address';
        createBtn.classList.remove('btn-secondary-variant');
        sectionHeader.querySelector('h2').innerHTML = '<idx class="fas fa-plus-circle"></idx> Generate New Email';
        inboxSection.style.display = 'none';
        messagesEl.innerHTML = '';
        hideStatus();
        clearAutoRefresh();
    }
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
        
        // making sure we got an array back
        if (!Array.isArray(data)) {
            throw new Error('Unexpected response shape');
        }

        if (data.length === 0) {
            if (!messagesEl.querySelector('.empty-inbox')) {
                messagesEl.innerHTML = '<div class="empty-inbox">No messages yet. Please check back in a few seconds.</div>';
            }
            return;
        }


        const currentMessageCount = messagesEl.querySelectorAll('.message-item').length;
        if (currentMessageCount !== data.length || currentMessageCount === 0) {
            messagesEl.innerHTML = ''; 
            
            // loop through each message and create the HTML
            data.forEach((msg) => {
                const item = document.createElement('div');
                item.className = 'message-item';
                

                const fromMatch = msg.from ? msg.from.match(/([^<]+)\s*(?:<([^>]+)>)?/) : null;
                const fromName = fromMatch ? fromMatch[1].trim().replace(/^\"|\"$/g, '') : 'Unknown';
                const fromEmail = msg.from ? (msg.from.match(/<([^>]+)>/)?.at(1) || msg.from) : 'N/A';
                
                //time
                const timestamp = msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', {
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit'
                }) : 'Unknown';

                // message HTML
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
                
                messagesEl.appendChild(item);
            });
        }
    } catch (error) {
        console.error('fetchMessages', error);


        if (messagesEl.innerHTML === '' || messagesEl.querySelector('.empty-inbox')) {
            setStatus('Error loading messages: ' + error.message, 'error');
        }
    }
}

// escape HTML to prevent XSS attacks - just for testinggg..
function escapeHtml(raw) {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// generate a new temporary email address
async function generateEmail() {
    const minVal = DEFAULT_MIN_LEN;
    const maxVal = DEFAULT_MAX_LEN;

    try {
        createBtn.disabled = true; // prevent double-clicks
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
            }),
        });

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();
        
        if (!data.email) {
            throw new Error('No email returned');
        }

        // storing the email and token for later use
        await storageSet({ 
            tempMailAddress: data.email, 
            tempMailToken: data.token || '' 
        });
        
        emailAddressEl.textContent = data.email;
        updateUIState(true);
        setCreateResult(`Email generated: ${data.email}`, 'success');


        await fetchMessages(data.email);
        showInbox(data.email);
        
    } catch (error) {
        console.error('generateEmail', error);
        setCreateResult('Create failed: ' + error.message, 'error');
    } finally {
        createBtn.disabled = false; // re enable button
    }
}

// event listeners
createBtn.addEventListener('click', async () => {
    await generateEmail();
});

regenerateBtn.addEventListener('click', async () => {
    await generateEmail();
});

refreshBtn.addEventListener('click', async () => {
    const email = await storageGet('tempMailAddress');
    if (!email) {
        setStatus('No email, generate one first', 'error');
        return;
    }
    
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
    
    // copy to clipboard - catch errors silently
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
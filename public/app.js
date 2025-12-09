function deriveKey(passphrase){return CryptoJS.PBKDF2(passphrase,"dm-secret-salt",{keySize:256/32,iterations:2000});}
function encryptMessage(plaintext,passphrase){const key=deriveKey(passphrase);const iv=CryptoJS.lib.WordArray.random(16);const encrypted=CryptoJS.AES.encrypt(plaintext,key,{iv});const data=iv.concat(encrypted.ciphertext);return CryptoJS.enc.Base64.stringify(data);}
function decryptMessage(ciphertextB64,passphrase){try{const data=CryptoJS.enc.Base64.parse(ciphertextB64);const iv=CryptoJS.lib.WordArray.create(data.words.slice(0,4),16);const ct=CryptoJS.lib.WordArray.create(data.words.slice(4),data.sigBytes-16);const key=deriveKey(passphrase);const decrypted=CryptoJS.AES.decrypt({ciphertext:ct},key,{iv});return CryptoJS.enc.Utf8.stringify(decrypted);}catch(e){return null;}}

const chatWindow=document.getElementById('chat-window');
const input=document.getElementById('message-input');
const sendBtn=document.getElementById('send-btn');
const passInput=document.getElementById('passphrase');
const statusSpan=document.getElementById('conn-status');

let ws;const messages=new Map();

function connect(){const loc=window.location;const proto=loc.protocol==='https:'?'wss:':'ws:';const wsUrl=proto+'//'+loc.host;ws=new WebSocket(wsUrl);ws.addEventListener('open',()=>{statusSpan.textContent='Connected to AI node';});ws.addEventListener('close',()=>{statusSpan.textContent='Disconnected. Reconnecting...';setTimeout(connect,2000);});ws.addEventListener('message',event=>{const payload=JSON.parse(event.data);if(payload.type==='cipher'){handleIncomingCipher(payload);}else if(payload.type==='ack'){handleAck(payload);}});}connect();

function createMessageElement({id,text,who}){const wrapper=document.createElement('div');wrapper.className=`message ${who}`;wrapper.dataset.id=id;const meta=document.createElement('span');meta.className='meta';meta.textContent=who==='me'?'You':'AI / Partner';const tick=document.createElement('span');tick.className='tick';meta.appendChild(tick);const body=document.createElement('div');body.textContent=text;wrapper.appendChild(meta);wrapper.appendChild(body);chatWindow.appendChild(wrapper);chatWindow.scrollTop=chatWindow.scrollHeight;return{wrapper,tick};}

function updateTick(id,status){const msg=messages.get(id);if(!msg)return;const tick=msg.tick;tick.classList.remove('blue','red');if(status==='seen-ok'){tick.classList.add('blue');tick.textContent='✔✔';}else if(status==='seen-bad'){tick.classList.add('red');tick.textContent='!';}setTimeout(()=>{if(msg.wrapper.parentNode){msg.wrapper.parentNode.removeChild(msg.wrapper);messages.delete(id);}},60000);}

function generateFakeAiReply(userText){const t=userText.toLowerCase();if(t.includes('seo'))return'To improve SEO, focus on technical health, high-quality content and relevant backlinks. Start with on-page basics like title tags and internal links.';if(t.includes('instagram'))return'For Instagram, maintain a consistent posting schedule, mix reels and carousels, and double-down on formats with higher engagement.';if(t.includes('ads')||t.includes('google'))return'For paid ads, test multiple creatives, refine targeting, and monitor metrics like CTR, CPC and conversion rate to optimize campaigns.';return'Effective digital marketing starts with a clear audience, consistent content, and regular experimentation across channels.';}

function sendPlainMessage(){const msg=input.value.trim();const pass=passInput.value;if(!msg||!pass||!ws||ws.readyState!==WebSocket.OPEN)return;const id=Date.now().toString()+'-'+Math.random().toString(16).slice(2);const cipher=encryptMessage(msg,pass);const {wrapper,tick}=createMessageElement({id,text:msg,who:'me'});messages.set(id,{wrapper,tick});ws.send(JSON.stringify({type:'cipher',id,body:cipher}));input.value='';const fake=generateFakeAiReply(msg);setTimeout(()=>{createMessageElement({id:'ai-'+id,text:fake,who:'ai'});},500);}

function handleIncomingCipher({id,body}){const pass=passInput.value;let plain=null;if(pass){plain=decryptMessage(body,pass);}if(!pass||!plain){createMessageElement({id:'recv-'+id,text:plain||'[Encrypted message; wrong or missing key]',who:'ai'});ws.send(JSON.stringify({type:'ack',id,status:'seen-bad'}));}else{createMessageElement({id:'recv-'+id,text:plain,who:'ai'});ws.send(JSON.stringify({type:'ack',id,status:'seen-ok'}));}}

function handleAck({id,status}){updateTick(id,status);}

sendBtn.addEventListener('click',sendPlainMessage);input.addEventListener('keydown',e=>{if(e.key==='Enter')sendPlainMessage();});

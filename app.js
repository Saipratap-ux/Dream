/* Somnia demo. AI services are intentionally not called from the browser.
   Configure a secure backend and set window.SOMNIA_API_BASE to enable providers. */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORE = "somnia.entries.v1";
let entries = loadEntries(), activeEntry = null, mediaRecorder = null, chunks = [], deferredInstall = null;

function loadEntries(){try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch{return []}}
function persist(){localStorage.setItem(STORE,JSON.stringify(entries));renderRecent();updateStats()}
function words(s){return (s.trim().match(/\S+/g)||[]).length}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function titleFrom(s){const t=s.trim().split(/[.!?\n]/)[0];return (t||"Untitled dream").slice(0,52)}
function showView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#page-name').textContent=name.toUpperCase().replace('-',' ');window.scrollTo(0,0);if(name==='library')renderLibrary();if(name==='insights')updateStats()}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$('#theme-toggle').addEventListener('click',toggleTheme);
function toggleTheme(){document.body.classList.toggle('light');const light=document.body.classList.contains('light');localStorage.setItem('somnia.theme',light?'light':'dark');$('#dark-setting').checked=light}
if(localStorage.getItem('somnia.theme')==='light')toggleTheme();
$('#dark-setting').addEventListener('change',e=>{document.body.classList.toggle('light',e.target.checked);localStorage.setItem('somnia.theme',e.target.checked?'light':'dark')});
$('#dream-text').addEventListener('input',()=>{$('#word-count').textContent=`${words($('#dream-text').value)} words · autosaved locally`;localStorage.setItem('somnia.draft',$('#dream-text').value)});
$('#dream-text').value=localStorage.getItem('somnia.draft')||'';
$('#word-count').textContent=`${words($('#dream-text').value)} words · autosaved locally`;
$('#clear-dream').addEventListener('click',()=>{if(confirm('Clear the current draft?')){$('#dream-text').value='';localStorage.removeItem('somnia.draft');$('#word-count').textContent='0 words · autosaved locally'}});
$('#record-btn').addEventListener('click',async()=>{
  if(mediaRecorder?.state==='recording'){mediaRecorder.stop();return}
  if(!navigator.mediaDevices?.getUserMedia){$('#record-status').textContent='Microphone recording is not supported in this browser. Try uploading an audio file.';return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];
    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    mediaRecorder.onstop=()=>{try{mediaRecorder._recognition?.stop()}catch(_){};const blob=new Blob(chunks,{type:mediaRecorder.mimeType||'audio/webm'});const url=URL.createObjectURL(blob);const audio=document.createElement('audio');audio.controls=true;audio.src=url;audio.style.display='block';audio.style.marginTop='12px';$('.record-copy').append(audio);$('#record-status').textContent='Recording saved in this page session. Transcription requires a speech-to-text provider.';stream.getTracks().forEach(t=>t.stop());$('#record-btn').classList.remove('recording');$('#record-label').textContent='Start recording'};
    mediaRecorder.start();$('#record-btn').classList.add('recording');$('#record-label').textContent='Stop recording';$('#record-status').textContent='Listening… speak naturally, then stop when you are done.';
    // Browser-native speech recognition provides live draft transcription where supported.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SpeechRecognition){
      const recognition = new SpeechRecognition();
      recognition.lang = ({en:'en-IN',hi:'hi-IN',or:'or-IN',es:'es-ES',fr:'fr-FR'})[$('#language-select').value] || 'en-IN';
      recognition.continuous = true; recognition.interimResults = true;
      let finalTranscript = '';
      recognition.onresult = event => {
        let interim = '';
        for(let i=event.resultIndex;i<event.results.length;i++){
          const part = event.results[i][0].transcript;
          if(event.results[i].isFinal) finalTranscript += part + ' ';
          else interim += part;
        }
        const current = $('#dream-text').value.trim();
        const prior = $('#voice-transcript-prefix')?.value || '';
        const combined = (prior + finalTranscript + interim).trim();
        $('#dream-text').value = combined;
        $('#word-count').textContent = `${words(combined)} words · live transcription`;
        localStorage.setItem('somnia.draft', combined);
      };
      recognition.onerror = event => { $('#record-status').textContent = `Recording continues. Speech recognition: ${event.error}.`; };
      recognition.onend = () => { if(mediaRecorder?.state==='recording') { try{recognition.start()}catch(_){} } };
      mediaRecorder._recognition = recognition;
      try{recognition.start();$('#record-status').textContent='Recording + live speech transcription. Review the transcript before saving.'}catch(_){}
    } else {
      $('#record-status').textContent='Recording audio. Live transcription is not supported in this browser; connect a speech-to-text provider or type your transcript.';
    }
  }catch(e){$('#record-status').textContent='Microphone access was not granted. Check your browser permissions.'}
});
$('#upload-audio').addEventListener('click',()=>$('#audio-file').click());
$('#audio-file').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);const audio=document.createElement('audio');audio.controls=true;audio.src=url;audio.style.display='block';audio.style.marginTop='12px';$('.record-copy').append(audio);$('#record-status').textContent=`${f.name} loaded. Connect speech-to-text to transcribe this file.`});
$('#analyze-btn').addEventListener('click',async()=>{
 const text=$('#dream-text').value.trim();if(!text){$('#dream-text').focus();return}
 const entry={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),text,title:titleFrom(text),date:new Date().toISOString(),analysis:analyzeLocally(text)};
 entries.unshift(entry);activeEntry=entry;persist();localStorage.removeItem('somnia.draft');$('#dream-text').value='';$('#word-count').textContent='0 words · autosaved locally';renderResult(entry);
});
function analyzeLocally(text){
 const lower=text.toLowerCase(), symbols=[];
 const dict=[['water',['water','ocean','sea','river','rain','lake']],['journey',['train','road','journey','car','plane','boat']],['threshold',['door','gate','station','bridge','window']],['flight',['fly','flying','sky','falling']],['shadow',['dark','shadow','stranger','monster']],['home',['house','home','room','bed']],['animal',['dog','cat','bird','snake','horse']]];
 dict.forEach(([name,terms])=>{if(terms.some(t=>lower.includes(t)))symbols.push(name)});
 if(!symbols.length)symbols.push('the unknown');
 let feeling='An invitation to notice what is changing';let archetype='The Journey / The Seeker';let question='What part of this dream feels most alive when you remember it?';
 if(/water|ocean|sea|river|rain/.test(lower)){feeling='A meeting with the emotional deep';archetype='The Unconscious / The Great Mother';question='What did the water feel like to you — welcoming, overwhelming, still, or something else?'}
 else if(/fly|flying|sky|fall/.test(lower)){feeling='Freedom held alongside vulnerability';archetype='The Self / The Hero';question='Where in waking life do you feel lifted, exposed, or ready to take a risk?'}
 else if(/dark|shadow|monster|stranger/.test(lower)){feeling='An encounter with the unfamiliar';archetype='The Shadow';question='If this unfamiliar figure had a message, what might it want you to notice?'}
 else if(/house|home|room/.test(lower)){feeling='An exploration of the inner home';archetype='The House as a symbol of the psyche';question='Which room or part of the house felt most important, and what does it remind you of?'}
 return {symbols,feeling,archetype,question};
}
function renderResult(e){
 $('#result-title').textContent=e.title;$('#result-date').textContent=new Date(e.date).toLocaleString();$('#emotion-title').textContent=e.analysis.feeling;$('#emotion-copy').textContent='A possible emotional reading of the imagery and mood in your account. Notice what fits; you are the best authority on your experience.';$('#archetype-title').textContent=e.analysis.archetype;$('#archetype-copy').textContent='In a Jungian-inspired lens, this archetype can offer a metaphor for inner movement. It is not a fixed decoding or a clinical assessment.';$('#reflection-question').textContent=e.analysis.question;
 $('#symbol-chips').innerHTML=e.analysis.symbols.map(s=>`<button class="chip" data-symbol="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join('');
 $$('#symbol-chips .chip').forEach(b=>b.addEventListener('click',()=>askSymbol(b.dataset.symbol)));
 $('#chat-messages').innerHTML='<div class="assistant-msg">Which part of this dream stayed with you after waking?</div>';
 showView('result');
 if(window.SOMNIA_API_BASE)enhanceWithBackend(e);
}
async function enhanceWithBackend(e){
 try{const r=await fetch(`${window.SOMNIA_API_BASE}/dream/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:e.text,locale:$('#language-select').value})});if(!r.ok)throw Error('Provider unavailable');const d=await r.json();if(d.imageUrl){$('#dream-art').innerHTML=`<img alt="Surrealist interpretation of the dream" src="${escapeHTML(d.imageUrl)}">`;}if(d.interpretation){$('#emotion-copy').textContent=d.interpretation.emotionalTheme||$('#emotion-copy').textContent;$('#archetype-copy').textContent=d.interpretation.archetypalLens||$('#archetype-copy').textContent;}}catch(err){console.warn('AI enhancement unavailable:',err)}
}
function askSymbol(s){$('#chat-input').value=`What might “${s}” mean in my dream?`;$('#chat-input').focus()}
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();const q=$('#chat-input').value.trim();if(!q)return;addMessage(q,'user-msg');$('#chat-input').value='';const answer=reflectiveReply(q,activeEntry);setTimeout(()=>addMessage(answer,'assistant-msg'),180)});
function reflectiveReply(q,e){const symbol=(q.match(/“([^”]+)”|"([^"]+)"/)||[]).slice(1).find(Boolean);return symbol?`Try beginning with your personal association to ${symbol}: what memory, person, place, or feeling does it bring up? In a Jungian-inspired approach, a symbol is not a universal code. It can be a bridge between the dream image and your own inner life. What did ${symbol} seem to be doing in the dream?`:`One gentle way to explore this is to ask what the detail meant to you in the moment. Did it feel comforting, threatening, familiar, or strange? Jungian ideas can be useful metaphors, but they cannot establish one definitive meaning. What personal association comes to mind first?`}
function addMessage(t,cls){const d=document.createElement('div');d.className=cls;d.textContent=t;$('#chat-messages').append(d);$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight}
$('#back-journal').addEventListener('click',()=>showView('journal'));
function renderRecent(){const list=$('#recent-list');if(!entries.length){list.innerHTML='<div class="empty-state">Your journal is waiting for its first dream.</div>';return}list.innerHTML=entries.slice(0,3).map(e=>`<div class="dream-row" data-id="${e.id}"><div><b>${escapeHTML(e.title)}</b><small>${new Date(e.date).toLocaleDateString()} · ${words(e.text)} words</small></div><span class="arrow">↗</span></div>`).join('');$$('.dream-row').forEach(el=>el.addEventListener('click',()=>{activeEntry=entries.find(e=>e.id===el.dataset.id);renderResult(activeEntry)}))}
function renderLibrary(){const list=$('#library-list');list.innerHTML=entries.length?entries.map(e=>`<div class="dream-row" data-id="${e.id}"><div><b>${escapeHTML(e.title)}</b><small>${new Date(e.date).toLocaleString()} · ${words(e.text)} words</small></div><span class="arrow">↗</span></div>`).join(''):'<div class="empty-state">No dreams saved yet.</div>';$$('#library-list .dream-row').forEach(el=>el.addEventListener('click',()=>{activeEntry=entries.find(e=>e.id===el.dataset.id);renderResult(activeEntry)}))}
function updateStats(){const count=entries.length,total=entries.reduce((a,e)=>a+words(e.text),0);['#stat-dreams','#admin-entries'].forEach(s=>{if($(s))$(s).textContent=count});if($('#stat-words'))$('#stat-words').textContent=total;if($('#theme-list'))$('#theme-list').textContent=count?`You have ${count} saved dream${count===1?'':'s'}. Revisit them gently to notice patterns.`:'No patterns yet. Your first entry is the beginning.'}
$('#export-btn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(entries,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='somnia-dream-journal.json';a.click();URL.revokeObjectURL(a.href)});
$('#delete-all').addEventListener('click',()=>{if(confirm('Permanently delete all locally saved dreams from this browser?')){entries=[];persist();renderLibrary()}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#install-btn').hidden=false});
$('#install-btn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#install-btn').hidden=true});
if('serviceWorker'in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn))}
renderRecent();updateStats();

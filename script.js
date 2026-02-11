const supabaseUrl = 'https://dnelzlyuhhxloysstnlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZWx6bHl1aGh4bG95c3N0bmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTM4MjAsImV4cCI6MjA4MTQyOTgyMH0.jYdJM1FTJja_A5CdTN3C3FWlKd_0E1JgHyaM4767SLc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let onlineCount = 0;
let offlineCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', loadDashboard);

function getYTID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

async function loadDashboard() {
    const { data, error } = await _supabase.from('channels').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);

    document.getElementById('total-count').innerText = data.length;
    const listContainer = document.getElementById('admin-list');
    listContainer.innerHTML = '';
    onlineCount = 0; 
    offlineCount = 0;

    for (const ch of data) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-4 flex items-center gap-3">
                <img src="${ch.logo}" class="w-10 h-10 rounded-lg bg-slate-800 object-contain p-1 border border-slate-700" onerror="this.src='https://via.placeholder.com/40'">
                <span class="font-bold text-sm text-gray-200">${ch.name}</span>
            </td>
            <td class="p-4 uppercase text-[10px] text-pink-400 font-mono">${ch.type || 'm3u8'}</td>
            <td class="p-4 text-center" id="stat-${ch.id}">
                <span class="text-[10px] text-gray-500 italic">Checking...</span>
            </td>
            <td class="p-4 text-center">
                <button onclick="deleteChannel('${ch.id}')" class="text-red-500 hover:text-red-400 font-bold text-xs">DELETE</button>
            </td>
        `;
        listContainer.appendChild(tr);
        checkChannelStatus(ch);
    }
}

async function checkChannelStatus(ch) {
    let isOnline = false;

    if (ch.type === 'm3u8' || !ch.type) {
        isOnline = await new Promise((resolve) => {
            const video = document.createElement('video');
            video.style.display = 'none';
            
            const timer = setTimeout(() => {
                video.src = "";
                video.load();
                video.remove();
                resolve(false); 
            }, 30000); // 30 second timeout

            video.onloadedmetadata = () => {
                clearTimeout(timer);
                video.remove();
                resolve(true);
            };
            video.onerror = () => {
                clearTimeout(timer);
                video.remove();
                resolve(false);
            };
            video.src = ch.url;
        });
    } else {
        isOnline = true; // YouTube/Iframe defaults
    }

    const statusEl = document.getElementById(`stat-${ch.id}`);
    if (isOnline) {
        onlineCount++;
        statusEl.innerHTML = `<span class="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Online</span>`;
    } else {
        offlineCount++;
        statusEl.innerHTML = `<span class="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Offline</span>`;
    }
    
    document.getElementById('online-count').innerText = onlineCount;
    document.getElementById('offline-count').innerText = offlineCount;
}

async function addChannel() {
    const name = document.getElementById('ch-name').value;
    let url = document.getElementById('ch-url').value;
    const logo = document.getElementById('ch-logo').value;
    const type = document.getElementById('ch-type').value;

    if(!name || !url) return alert("তথ্য পূরণ করুন!");
    if (type === 'youtube') url = getYTID(url);

    const { error } = await _supabase.from('channels').insert([{ name, url, logo, type }]);
    if (error) alert("Error: " + error.message);
    else location.reload();
}

async function deleteChannel(id) {
    if(!confirm("Are you sure you want to delete this channel?")) return;
    const { error } = await _supabase.from('channels').delete().eq('id', id);
    if (error) alert(error.message);
    else location.reload();
}

async function time() {
    const { data, error } = await _supabase
        .from('user_stats') 
        .select('total_seconds');           

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data) {
        // 1. Sum up all the seconds from the array of objects
        const totalSeconds = data.reduce((sum, row) => sum + (row.total_seconds || 0), 0);
        
        // 2. Convert seconds to hours (Seconds / 3600)
        // logic: 60 seconds * 60 minutes = 3600
        let totalHours = totalSeconds / 3600;
        
        // 3. Update the UI
        document.getElementById('usage-time').innerText = totalHours.toFixed(4) + ' ঘন্টা';
    }
}

// Run every 5 seconds instead of 500ms to save your Supabase quota!
setInterval(time, 5000); 
time();
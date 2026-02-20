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
        // টাইপ অনুযায়ী আলাদা রং নির্ধারণ (ঐচ্ছিক)
        const typeColor = ch.type === 'tap' ? 'text-yellow-400' : 'text-pink-400';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-4 flex items-center gap-3">
                <img src="${ch.logo}" class="w-10 h-10 rounded-lg bg-slate-800 object-contain p-1 border border-slate-700" onerror="this.src='https://via.placeholder.com/40'">
                <span class="font-bold text-sm text-gray-200">${ch.name}</span>
            </td>
            <td class="p-4 uppercase text-[10px] ${typeColor} font-mono">${ch.type || 'm3u8'}</td>
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

    time();
    setInterval(time, 5000);
}

async function checkChannelStatus(ch) {
    let isOnline = false;

    // যদি টাইপ m3u8 হয় তবে নেটওয়ার্ক চেক করবে
    if (ch.type === 'm3u8' || !ch.type) {
        isOnline = await new Promise((resolve) => {
            const video = document.createElement('video');
            video.style.display = 'none';
            
            const timer = setTimeout(() => {
                video.src = "";
                video.load();
                video.remove();
                resolve(false); 
            }, 15000); // চেক করার সময় ১৫ সেকেন্ড করা হলো দ্রুত রেজাল্টের জন্য

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
        // ইউটিউব, আইফ্রেম এবং "TAP" টাইপ সবসময় অনলাইন দেখাবে
        isOnline = true; 
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
    const type = document.getElementById('ch-type').value; // 'tap' এখান থেকে আসবে

    if(!name || !url) return alert("তথ্য পূরণ করুন!");
    if (type === 'youtube') url = getYTID(url);

    // সরাসরি ডাটাবেসে টাইপ সহ সেভ করা
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
        const totalSeconds = data.reduce((sum, row) => sum + (row.total_seconds || 0), 0);
        let totalHours = totalSeconds / 3600;
        document.getElementById('usage-time').innerText = totalHours.toFixed(4) + ' ঘন্টা';
    }
}
setInterval(time, 60);
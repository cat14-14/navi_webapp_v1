// schedule.js
// — common-ai.js처럼 파일 맨 위에 복붙 —

// 1) AI 호출: messages 배열을 서버로 전송
// memo.js (맨 상단)
async function callAI(messages) {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  if (!res.ok) throw new Error(`AI 호출 실패: ${res.status}`);
  return await res.json();               // { role, content }
}

function parseAICommand(content) {
  try { return JSON.parse(content); }
  catch { return { action: 'chat_only', text: content }; }
}


let tasks = JSON.parse(localStorage.getItem('tasks')) || {};
let selectedDate = null;
let currentMonth = new Date();
let showingDeadline = false;
let showingToday = false;

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function formatDate(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();

  document.getElementById('calendar-title').textContent = `${year}년 ${month + 1}월`;

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  dayNames.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.innerText = day;
    calendar.appendChild(dayEl);
  });

  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-blank';
    calendar.appendChild(blank);
  }

  const todayStr = formatDate(today);
  for (let i = 1; i <= last.getDate(); i++) {
    const date = new Date(year, month, i);
    const key = formatDate(date);
    const el = document.createElement('div');
    el.className = 'calendar-date';
    if (key === todayStr) el.classList.add('today');

    const dayTasks = tasks[key] || [];
    const importantExists = dayTasks.some(t => t.important);
    el.innerHTML = importantExists ? `${i} ⭐` : `${i}`;

    if (selectedDate === key) el.classList.add('selected');

    el.addEventListener('click', () => {
      if (selectedDate === key) {
        selectedDate = null;
        document.getElementById('schedule-list').innerHTML = '';
      } else {
        selectedDate = key;
        showingDeadline = false;
        showingToday = false;
        renderScheduleList();
      }
      renderCalendar();
    });

    calendar.appendChild(el);
  }
}

function renderScheduleList() {
  const scheduleList = document.getElementById('schedule-list');
  if (!selectedDate) {
    scheduleList.innerHTML = '<p>날짜를 선택하세요.</p>';
    return;
  }
  const list = tasks[selectedDate] || [];
  if (list.length === 0) {
    scheduleList.innerHTML = `<h4>${selectedDate} 일정</h4><p>일정이 없습니다.</p>`;
  } else {
    const ul = document.createElement('ul');
    list.forEach((item, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `${item.important ? '⭐ ' : ''}<strong>${item.title}</strong> (마감일: ${item.deadline})`;
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '삭제';
      delBtn.onclick = () => deleteSchedule(selectedDate, idx, item.important);
      li.appendChild(delBtn);
      ul.appendChild(li);
    });
    scheduleList.innerHTML = `<h4>${selectedDate} 일정</h4>`;
    scheduleList.appendChild(ul);
  }
}

function renderTodayTasks() {
  const area = document.getElementById('schedule-list');

  if (showingToday) {
    area.innerHTML = '';
    showingToday = false;
    return;
  }

  const todayStr = formatDate(new Date());
  const list = tasks[todayStr] || [];

  selectedDate = null;
  showingDeadline = false;
  showingToday = true;

  if (list.length === 0) {
    area.innerHTML = `<h4>오늘 일정</h4><p>일정이 없습니다.</p>`;
  } else {
    const ul = document.createElement('ul');
    list.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `${item.important ? '⭐ ' : ''}<strong>${item.title}</strong> (마감일: ${item.deadline})`;
      ul.appendChild(li);
    });
    area.innerHTML = `<h4>오늘 일정</h4>`;
    area.appendChild(ul);
  }
}

function renderDeadlineTasks() {
  const area = document.getElementById('schedule-list');

  if (showingDeadline) {
    area.innerHTML = '';
    showingDeadline = false;
    return;
  }

  const todayStr = formatDate(new Date());
  const result = Object.entries(tasks).flatMap(([date, items]) =>
    items.filter(item => item.deadline === todayStr)
  );

  showingDeadline = true;
  showingToday = false;
  selectedDate = null;

  if (result.length === 0) {
    area.innerHTML = `<h3>오늘 마감 일정</h3><p>마감 일정이 없습니다.</p>`;
  } else {
    area.innerHTML = `<h3>오늘 마감 일정</h3><ul>` +
      result.map(item => `<li>${item.important ? '⭐ ' : ''}${item.title} (마감일: ${item.deadline})</li>`).join('') + `</ul>`;
  }
}

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  selectedDate = null;
  showingDeadline = false;
  showingToday = false;
  renderCalendar();
  document.getElementById('schedule-list').innerHTML = '';
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  selectedDate = null;
  showingDeadline = false;
  showingToday = false;
  renderCalendar();
  document.getElementById('schedule-list').innerHTML = '';
});

document.getElementById('go-today').addEventListener('click', () => {
  currentMonth = new Date();
  renderCalendar();
  renderTodayTasks();
});

document.getElementById('filter-deadline').addEventListener('click', () => {
  renderCalendar();
  renderDeadlineTasks();
});

window.addSchedule = function () {
  const title = document.getElementById('task-title').value;
  let deadline = document.getElementById('task-deadline').value;
  const important = document.getElementById('task-important').checked;

  if (!deadline) deadline = formatDate(new Date());
  if (!title) return alert('일정 제목을 입력하세요.');

  const date = selectedDate || formatDate(new Date());
  if (!tasks[date]) tasks[date] = [];
  tasks[date].push({ title, deadline, important });

  saveTasks();
  renderCalendar();
  renderScheduleList();

  document.getElementById('task-title').value = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-important').checked = false;
};

window.deleteSchedule = function (date, index, isImportant) {
  if (isImportant) {
    const box = document.createElement('div');
    box.className = 'delete-confirm-box';
    box.innerHTML = `
      <div class="confirm-content">
        <p><strong>중요 일정</strong>을 삭제하시겠습니까?</p>
        <div class="confirm-actions">
          <button class="confirm-delete">삭제</button>
          <button class="confirm-cancel">취소</button>
        </div>
      </div>
    `;
    document.body.appendChild(box);
    box.querySelector('.confirm-delete').onclick = () => {
      tasks[date].splice(index, 1);
      if (tasks[date].length === 0) delete tasks[date];
      saveTasks();
      box.remove();
      renderCalendar();
      renderScheduleList();
    };
    box.querySelector('.confirm-cancel').onclick = () => box.remove();
  } else {
    tasks[date].splice(index, 1);
    if (tasks[date].length === 0) delete tasks[date];
    saveTasks();
    renderCalendar();
    renderScheduleList();
  }
};

window.sendToAI = function () {
  const text = document.getElementById('chat-text').value.trim();
  if (!text) return;

  const log = document.getElementById('chat-log');
  const userMsg = document.createElement('div');
  userMsg.textContent = `🧍 ${text}`;
  log.appendChild(userMsg);

  const reply = document.createElement('div');
  reply.textContent = '🤖 AI가 기능을 분석하고 일정을 추가할 예정입니다. (향후 구현)';
  log.appendChild(reply);

  document.getElementById('chat-text').value = '';
  log.scrollTop = log.scrollHeight;
};

document.addEventListener('DOMContentLoaded', renderCalendar);

// 1) 공통 헬퍼 함수 (memo.js / schedule.js 등에 복붙)

// 2) 예: 메모 페이지에서 전송 버튼 클릭 시
document.getElementById('memo-send-btn').addEventListener('click', async () => {
  const userText = document.getElementById('memo-chat-text').value.trim();
  if (!userText) return;

  // (가) 대화 기록 준비
  const memoId   = currentMemoId;
  const memoText = getMemoContent(memoId);
  const messages = [
    { role: 'system', content: '당신은 메모를 편집해 주는 AI입니다. JSON 명령만 응답하세요.' },
    { role: 'user',   content: `메모(${memoId}) 현재 내용:\n${memoText}\n--\n수정 요청: ${userText}` }
  ];

  // (나) AI 호출
  const aiMessage = await callAI(messages);

  // (다) 화면에 표시
  appendChat('🤖', aiMessage.content);

  // (라) JSON 명령 파싱 & 실행
  const cmd = JSON.parse(aiMessage.content);
  if (cmd.action === 'update_memo' && cmd.memoId === memoId) {
    updateMemoContent(memoId, cmd.content);
  }
  function appendChat(who, text, prefix) {
    const log = document.getElementById(`${prefix}-chat-log`);
    const el  = document.createElement('div');
    el.textContent = `${who} ${text}`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function updateMemoContent(id, newText) {
    const item = memoData.find(m=>m.id===id);
    if (!item) return;
    item.content = newText; save();      // 로컬스토리지 저장
    document.getElementById('memo-content').value = newText;
  }
  
});

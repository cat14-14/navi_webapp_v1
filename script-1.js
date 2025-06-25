// script-1.js (index.html 전용, 오류 수정 및 기능 추가)

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
  if (!calendar) return;
  calendar.innerHTML = '';

  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();

  const titleEl = document.getElementById('calendar-title');
  if (titleEl) titleEl.textContent = `${year}년 ${month + 1}월`;

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  days.forEach(day => {
    const el = document.createElement('div');
    el.className = 'calendar-day';
    el.textContent = day;
    calendar.appendChild(el);
  });

  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-blank';
    calendar.appendChild(blank);
  }

  const todayStr = formatDate(today);

  for (let i = 1; i <= last.getDate(); i++) {
    const date = new Date(year, month, i);
    const dateStr = formatDate(date);
    const el = document.createElement('div');
    el.className = 'calendar-date';
    if (dateStr === todayStr) el.classList.add('today');
    if (dateStr === selectedDate) el.classList.add('selected');

    const dayTasks = tasks[dateStr] || [];
    const important = dayTasks.some(t => t.important);
    el.innerHTML = important ? `${i} ⭐` : `${i}`;

    el.addEventListener('click', () => {
      if (selectedDate === dateStr) {
        selectedDate = null;
        document.getElementById('custom-area').innerHTML = '';
      } else {
        selectedDate = dateStr;
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
  const area = document.getElementById('custom-area');
  if (!selectedDate) {
    area.innerHTML = '<p>날짜를 선택하세요.</p>';
    return;
  }
  const list = tasks[selectedDate] || [];
  if (list.length === 0) {
    area.innerHTML = `<h4>${selectedDate} 일정</h4><p>일정이 없습니다.</p>`;
  } else {
    const ul = document.createElement('ul');
    list.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `${item.important ? '⭐ ' : ''}<strong>${item.title}</strong> (마감일: ${item.deadline})`;
      ul.appendChild(li);
    });
    area.innerHTML = `<h4>${selectedDate} 일정</h4>`;
    area.appendChild(ul);
  }
}

function renderTodayTasks() {
  const area = document.getElementById('custom-area');

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
  const area = document.getElementById('custom-area');

  if (showingDeadline) {
    area.innerHTML = '';
    showingDeadline = false;
    return;
  }

  const todayStr = formatDate(new Date());
  const result = Object.entries(tasks).flatMap(([date, items]) =>
    items.filter(item => item.deadline === todayStr)
  );

  selectedDate = null;
  showingToday = false;
  showingDeadline = true;

  if (result.length === 0) {
    area.innerHTML = `<h4>오늘 마감 일정</h4><p>마감 일정이 없습니다.</p>`;
  } else {
    area.innerHTML = `<h4>오늘 마감 일정</h4><ul>` +
      result.map(item => `<li>${item.important ? '⭐ ' : ''}${item.title} (마감일: ${item.deadline})</li>`).join('') + `</ul>`;
  }
}

document.getElementById('prev-month')?.addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  selectedDate = null;
  showingToday = false;
  showingDeadline = false;
  document.getElementById('custom-area').innerHTML = '';
  renderCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  selectedDate = null;
  showingToday = false;
  showingDeadline = false;
  document.getElementById('custom-area').innerHTML = '';
  renderCalendar();
});

document.getElementById('filter-today')?.addEventListener('click', () => {
  currentMonth = new Date();
  renderCalendar();
  renderTodayTasks();
});

document.getElementById('filter-deadline')?.addEventListener('click', () => {
  renderCalendar();
  renderDeadlineTasks();
});

document.addEventListener('DOMContentLoaded', () => {
  renderCalendar();
});

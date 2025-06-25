// memo.js - VSCode 스타일 메모 시스템
// 파일/폴더 우클릭: 생성, 이름 변경, 삭제 메뉴 완전 지원
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


document.addEventListener('DOMContentLoaded', () => {
    // 로컬스토리지 로드 및 저장 함수
    let memoData = JSON.parse(localStorage.getItem('memoData')) || [];
    const save = () => localStorage.setItem('memoData', JSON.stringify(memoData));
  
    // 주요 DOM 요소
    const sidebar       = document.getElementById('sidebar');
    const treeContainer = document.getElementById('memo-tree');
    const btnNewFolder  = document.getElementById('btnNewFolder');
    const btnNewMemo    = document.getElementById('btnNewMemo');
    const contextMenu   = document.getElementById('context-menu');
    const tabBar        = document.getElementById('tab-bar');
    const memoTitle     = document.getElementById('memo-title');
    const memoContent   = document.getElementById('memo-content');
    const emptyMessage  = document.getElementById('empty-message');
  
    let openTabs = {};
    let currentItem = null;
  
    // 전체 트리 렌더링
    function renderTree() {
      treeContainer.innerHTML = '';
      treeContainer.appendChild(buildTree(memoData));
    }
    
    // 트리 빌드 재귀 함수
    function buildTree(list) {
      const ul = document.createElement('ul');
      ul.className = 'tree-list';
      // 정렬: 폴더 먼저 → 숫자→문자
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, 'ko', {numeric: true});
      });
      list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'tree-node';
        li.dataset.id = item.id;
        li.dataset.type = item.type;
  
        const label = document.createElement('div');
        label.className = 'tree-label';
  
        const icon = document.createElement('span');
        icon.className = 'toggle-icon';
        icon.textContent = item.type === 'folder'
          ? (item.collapsed ? '▶' : '▼')
          : '•';
  
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tree-name';
        nameSpan.textContent = item.name;
  
        label.append(icon, nameSpan);
        li.append(label);
  
        // 폴더인 경우: 접기/펼치기 처리
        if (item.type === 'folder') {
          if (item.collapsed) li.classList.add('collapsed');
          label.addEventListener('click', () => {
            item.collapsed = !item.collapsed;
            save(); renderTree();
          });
          const childUl = buildTree(item.children || []);
          childUl.className = 'child-tree';
          li.appendChild(childUl);
        } else {
          // 메모 열기
          label.addEventListener('click', () => openItem(item));
        }
  
        // 개별 항목 우클릭 메뉴
        label.addEventListener('contextmenu', e => {
          e.preventDefault();
          showContextMenu(e.pageX, e.pageY, item, memoData);
        });
  
        // 이름 변경 (더블클릭)
        nameSpan.addEventListener('dblclick', e => {
          e.stopPropagation();
          startRename(item, nameSpan);
        });
  
        ul.appendChild(li);
      });
      return ul;
    }
  
    // 이벤트 위임: 사이드바 배경 & 트리 공통 우클릭 핸들러
    function onContextMenu(e) {
      e.preventDefault(); hideMenu();
      const node = e.target.closest('.tree-node');
      const item = node ? findItemById(node.dataset.id) : null;
      showContextMenu(e.pageX, e.pageY, item, memoData);
    }
    sidebar.addEventListener('contextmenu', onContextMenu);
    treeContainer.addEventListener('contextmenu', onContextMenu);
  
    // 컨텍스트 메뉴 표시 함수
    function showContextMenu(x, y, item, list) {
      contextMenu.innerHTML = '';
      contextMenu.style.top = `${y}px`;
      contextMenu.style.left = `${x}px`;
      contextMenu.style.display = 'block';
  
      // 항상 표시: 새 폴더, 새 메모
      contextMenu.appendChild(makeMenu('폴더 만들기', () => addItem('folder', list, item)));
      contextMenu.appendChild(makeMenu('메모 만들기', () => addItem('memo',   list, item)));
  
      if (item) {
        // 항목별: 이름 변경, 삭제
        contextMenu.appendChild(makeMenu('이름 변경', () => {
          const span = document.querySelector(`[data-id="${item.id}"] .tree-name`);
          startRename(item, span);
        }));
        contextMenu.appendChild(makeMenu('삭제', () => deleteItem(item, list)));
      }
    }
  
    // 메뉴 아이템 생성 헬퍼
    function makeMenu(text, fn) {
      const div = document.createElement('div');
      div.textContent = text;
      div.addEventListener('click', () => { fn(); hideMenu(); });
      return div;
    }
  
    // 컨텍스트 메뉴 숨김
    function hideMenu() {
      contextMenu.style.display = 'none';
    }
    window.addEventListener('click', hideMenu);
  
    // 새 폴더/메모 생성
    function addItem(type, list, parent) {
      const newItem = {
        id: `id_${Date.now()}`,
        type,
        name: '',
        children: type === 'folder' ? [] : undefined,
        content: type === 'memo'   ? '' : undefined,
        collapsed: type === 'folder'
      };
      if (parent && parent.type === 'folder') parent.children.push(newItem);
      else list.push(newItem);
      if (parent) parent.collapsed = false;
      save(); renderTree();
      const span = document.querySelector(`[data-id="${newItem.id}"] .tree-name`);
      startRename(newItem, span);
    }
  
    // 항목 삭제
    function deleteItem(item, list) {
      function recurse(arr) {
        const idx = arr.findIndex(i => i.id === item.id);
        if (idx !== -1) { arr.splice(idx,1); return true; }
        for (const i of arr) {
          if (i.type === 'folder' && recurse(i.children)) return true;
        }
        return false;
      }
      recurse(list); save(); renderTree();
    }
  
    // 이름 변경 인라인 에디트
    function startRename(item, nameEl) {
      const input = document.createElement('input');
      input.type      = 'text';
      input.value     = item.name;
      input.className = 'rename-input';
      nameEl.replaceWith(input);
      input.focus();
      input.addEventListener('blur', () => {
        item.name = input.value.trim() || '이름 없음';
        save(); renderTree();
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    }
  
    // 메모 열기 및 탭 관리
    function openItem(item) {
      currentItem = item;
      memoTitle.textContent      = item.name;
      memoContent.value          = item.content;
      memoContent.style.display  = 'block';
      emptyMessage.style.display = 'none';
  
      if (!openTabs[item.id]) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.id = item.id;
        tab.innerHTML = `<span>${item.name}</span><span class=\"close-btn\">×</span>`;
        tab.addEventListener('click', () => openItem(item));
        tab.querySelector('.close-btn').addEventListener('click', e => {
          e.stopPropagation(); delete openTabs[item.id]; tab.remove();
          const keys = Object.keys(openTabs);
          if (keys.length) openItem(findItemById(keys[keys.length-1]));
          else { memoContent.style.display='none'; memoTitle.textContent=''; emptyMessage.style.display='block'; }
        });
        tabBar.appendChild(tab); openTabs[item.id] = tab;
      }
      Object.values(openTabs).forEach(t => t.classList.remove('active'));
      openTabs[item.id].classList.add('active');
    }
  
    // ID로 항목 찾기
    function findItemById(id, list = memoData) {
      for (const x of list) {
        if (x.id === id) return x;
        if (x.children) {
          const found = findItemById(id, x.children);
          if (found) return found;
        }
      }
      return null;
    }
  
    // 메모 내용 저장
    memoContent.addEventListener('input', () => {
      if (currentItem && currentItem.type === 'memo') {
        currentItem.content = memoContent.value;
        save();
      }
    });
  
    // 버튼 이벤트
    btnNewFolder.addEventListener('click', () => addItem('folder', memoData));
    btnNewMemo.addEventListener('click', () => addItem('memo',   memoData));
  
    // 최초 렌더
    renderTree();
      // ——— AI 채팅 버튼 이벤트 바인딩 ———
  document.getElementById('memo-send-btn')
  .addEventListener('click', sendMemoToAI);

// ——— AI 통신 핸들러 함수 ———
function sendMemoToAI() {
  const inputEl = document.getElementById('memo-chat-text');
  const text    = inputEl.value.trim();
  if (!text) return;

  const log = document.getElementById('memo-chat-log');

  // 1) 유저 메시지 추가
  const userMsg = document.createElement('div');
  userMsg.textContent = `🧍 ${text}`;
  log.appendChild(userMsg);

  // 2) AI 응답 자리 표시
  const reply = document.createElement('div');
  reply.textContent = '🤖 AI가 분석 중입니다...';
  log.appendChild(reply);

  // 입력 초기화 & 스크롤
  inputEl.value = '';
  log.scrollTop = log.scrollHeight;

  // TODO: 실제 AI 호출 로직을 여기서 구현하세요.
  // 1) 공통 헬퍼 함수 (memo.js / schedule.js 등에 복붙)


// 2) 예: 메모 페이지에서 전송 버튼 클릭 시
d// AI 전송 버튼 클릭 시
document.getElementById('memo-send-btn')
.addEventListener('click', async () => {
  if (!currentItem || currentItem.type !== 'memo') return;
  const text = document.getElementById('memo-chat-text').value.trim();
  if (!text) return;

  // 1) UI에 사용자 메시지
  appendChat('🧍', text, 'memo');

  // 2) AI에게 요청
  const messages = [
    { role:'system',   content:'너는 메모 편집 AI야. JSON 명령만 내려줘.' },
    { role:'user',     content:`메모(${currentItem.id}) 내용:\n${currentItem.content}\n수정:\n${text}` }
  ];
  let aiMsg;
  try { aiMsg = await callAI(messages); }
  catch (e) { return appendChat('⚠️', `AI 오류: ${e.message}`, 'memo'); }

  // 3) UI에 AI 메시지
  appendChat('🤖', aiMsg.content, 'memo');

  // 4) 명령 파싱 & 실행
  const cmd = parseAICommand(aiMsg.content);
  if (cmd.action==='update_memo' && cmd.memoId===currentItem.id) {
    updateMemoContent(cmd.memoId, cmd.content);
  }
});


  
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


});  // <-- 이 줄은 그대로 두세요

  
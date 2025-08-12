// グローバル変数
let tasks = [];
let currentTaskId = null;
let isRunning = false;
let currentTime = 0;
let interval = null;
let masterPassword = null;
let dailyReviews = [];
let suggestedTasks = [];

// 暗号化関数
function encrypt(text, password) {
    const textBytes = new TextEncoder().encode(text);
    const passwordBytes = new TextEncoder().encode(password);
    
    const encrypted = textBytes.map((byte, i) => 
        byte ^ passwordBytes[i % passwordBytes.length]
    );
    
    return btoa(String.fromCharCode(...encrypted));
}

function decrypt(encryptedText, password) {
    try {
        const encrypted = atob(encryptedText);
        const encryptedBytes = new Uint8Array([...encrypted].map(c => c.charCodeAt(0)));
        const passwordBytes = new TextEncoder().encode(password);
        
        const decrypted = encryptedBytes.map((byte, i) => 
            byte ^ passwordBytes[i % passwordBytes.length]
        );
        
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        throw new Error('復号化に失敗しました');
    }
}

// パスワード設定
function setupPassword() {
    const password = document.getElementById('masterPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (password.length < 8) {
        alert('パスワードは8文字以上で設定してください');
        return;
    }
    
    if (password !== confirm) {
        alert('パスワードが一致しません');
        return;
    }
    
    masterPassword = password;
    localStorage.setItem('timeTrackerPasswordSet', 'true');
    
    document.getElementById('passwordCard').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    loadData();
    updateDisplay();
    
    alert('✅ 暗号化が有効になりました！\nデータは安全に保護されます。');
}

// データの読み込み・保存
function loadData() {
    const encryptedData = localStorage.getItem('timeTrackerEncryptedData');
    if (encryptedData && masterPassword) {
        try {
            const decryptedData = decrypt(encryptedData, masterPassword);
            const savedData = JSON.parse(decryptedData);
            tasks = savedData.tasks || [];
            dailyReviews = savedData.dailyReviews || [];
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            tasks = [];
            dailyReviews = [];
        }
    }
}

function saveData() {
    if (masterPassword) {
        const dataToSave = {
            tasks: tasks,
            dailyReviews: dailyReviews
        };
        const dataString = JSON.stringify(dataToSave);
        const encryptedData = encrypt(dataString, masterPassword);
        localStorage.setItem('timeTrackerEncryptedData', encryptedData);
    }
}

// ユーティリティ関数
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    document.getElementById('timerDisplay').textContent = formatTime(currentTime);
    
    const completed = tasks.filter(t => t.completed).length;
    const totalTime = Math.round(tasks.reduce((sum, t) => sum + t.actualSeconds, 0) / 60);
    
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('totalTime').textContent = totalTime;
    
    renderTaskList();
}

function renderTaskList() {
    const container = document.getElementById('taskList');
    
    if (tasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 30px 0;">タスクを追加してください</p>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const isActive = task.id === currentTaskId;
        const actualMinutes = Math.round(task.actualSeconds / 60);
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isActive ? 'active' : ''}">
                <div class="task-info">
                    <h4>${task.name}</h4>
                    <p>予定: ${task.estimatedMinutes}分 | 実際: ${actualMinutes}分</p>
                </div>
                <div class="task-actions">
                    ${!task.completed && !isActive ? `<button class="btn-small" onclick="selectTask(${task.id})">開始</button>` : ''}
                    ${!task.completed ? `<button class="btn-small" onclick="markComplete(${task.id})">完了</button>` : ''}
                    <button class="btn-small" onclick="deleteTask(${task.id})">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

// タスク管理
function addTask() {
    const name = document.getElementById('taskName').value.trim();
    const estimate = parseInt(document.getElementById('taskEstimate').value);
    
    if (!name) return;
    
    const task = {
        id: Date.now(),
        name: name,
        estimatedMinutes: estimate,
        actualSeconds: 0,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveData();
    
    document.getElementById('taskName').value = '';
    document.getElementById('taskEstimate').value = '30';
    
    updateDisplay();
}

function selectTask(taskId) {
    if (currentTaskId) {
        stopTimer();
    }
    
    currentTaskId = taskId;
    currentTime = 0;
    
    const task = tasks.find(t => t.id === taskId);
    document.getElementById('currentTaskName').textContent = task.name;
    
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('completeBtn').classList.remove('hidden');
    
    updateDisplay();
}

function markComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = true;
        saveData();
        updateDisplay();
    }
}

function deleteTask(taskId) {
    if (currentTaskId === taskId) {
        stopTimer();
    }
    
    tasks = tasks.filter(t => t.id !== taskId);
    saveData();
    updateDisplay();
}

// タイマー機能
function startTimer() {
    if (!currentTaskId) return;
    
    isRunning = true;
    interval = setInterval(() => {
        currentTime++;
        updateDisplay();
    }, 1000);
    
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('pauseBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');
}

function pauseTimer() {
    isRunning = false;
    clearInterval(interval);
    
    const task = tasks.find(t => t.id === currentTaskId);
    if (task) {
        task.actualSeconds += currentTime;
        saveData();
    }
    
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');
    
    currentTime = 0;
    updateDisplay();
}

function stopTimer() {
    if (isRunning) {
        pauseTimer();
    }
    
    currentTaskId = null;
    currentTime = 0;
    
    document.getElementById('currentTaskName').textContent = 'タスクを選択してください';
    
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('completeBtn').classList.add('hidden');
    
    updateDisplay();
}

function completeTask() {
    if (!currentTaskId) return;
    
    if (isRunning) {
        pauseTimer();
    }
    
    markComplete(currentTaskId);
    stopTimer();
}

// 振り返り機能
function toggleReview() {
    const section = document.getElementById('reviewSection');
    section.classList.toggle('hidden');
    
    if (!section.classList.contains('hidden')) {
        populateTodayReview();
    }
}

function populateTodayReview() {
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt).toDateString();
        return today === taskDate;
    });

    const completedTasks = todayTasks.filter(t => t.completed);
    const incompleteTasks = todayTasks.filter(t => !t.completed);

    let accomplishmentsText = '';
    if (completedTasks.length > 0) {
        accomplishmentsText = completedTasks.map(task => {
            const actualMinutes = Math.round(task.actualSeconds / 60);
            const efficiency = task.estimatedMinutes > 0 ? Math.round((task.estimatedMinutes / actualMinutes) * 100) : 100;
            return `• ${task.name} (予定: ${task.estimatedMinutes}分 → 実際: ${actualMinutes}分, 効率: ${efficiency}%)`;
        }).join('\n');
    }

    let incompleteText = '';
    if (incompleteTasks.length > 0) {
        incompleteText = incompleteTasks.map(task => {
            const actualMinutes = Math.round(task.actualSeconds / 60);
            return `• ${task.name} (進捗: ${actualMinutes}分作業済み)`;
        }).join('\n');
    }

    document.getElementById('todayAccomplishments').value = accomplishmentsText;
    document.getElementById('todayIncomplete').value = incompleteText;
}

function generateTomorrowTasks() {
    const accomplishments = document.getElementById('todayAccomplishments').value;
    const incomplete = document.getElementById('todayIncomplete').value;
    const insights = document.getElementById('todayInsights').value;

    const todayReview = {
        date: new Date().toISOString().split('T')[0],
        accomplishments: accomplishments,
        incomplete: incomplete,
        insights: insights,
        tasksCompleted: tasks.filter(t => t.completed).length,
        tasksTotal: tasks.length,
        createdAt: new Date().toISOString()
    };

    dailyReviews.push(todayReview);
    saveData();

    const suggestions = generateSmartSuggestions(todayReview);
    displaySuggestions(suggestions);
}

function generateSmartSuggestions(todayReview) {
    const suggestions = [];
    const todayTasks = tasks.filter(task => {
        const today = new Date().toDateString();
        const taskDate = new Date(task.createdAt).toDateString();
        return today === taskDate;
    });

    const completedTasks = todayTasks.filter(t => t.completed);
    const incompleteTasks = todayTasks.filter(t => !t.completed);

    // 未完了タスクの継続
    incompleteTasks.forEach(task => {
        const actualMinutes = Math.round(task.actualSeconds / 60);
        const estimatedRemaining = Math.max(task.estimatedMinutes - actualMinutes, 15);
        
        suggestions.push({
            task: `${task.name}（継続）`,
            estimatedMinutes: estimatedRemaining,
            reason: `昨日未完了のため継続。残り予想時間: ${estimatedRemaining}分`,
            priority: 'high',
            type: 'carryover'
        });
    });

    // 効率改善提案
    completedTasks.forEach(task => {
        const actualMinutes = Math.round(task.actualSeconds / 60);
        const efficiency = task.estimatedMinutes > 0 ? (task.estimatedMinutes / actualMinutes) : 1;
        
        if (efficiency < 0.7) {
            const improvedEstimate = Math.round(actualMinutes * 1.2);
            suggestions.push({
                task: `${task.name}の改善・見直し`,
                estimatedMinutes: improvedEstimate,
                reason: `昨日は予想より時間がかかったため、手順の改善を検討`,
                priority: 'medium',
                type: 'improvement'
            });
        }
    });

    // 振り返り内容からの提案
    const insightsLower = todayReview.insights.toLowerCase();
    
    if (insightsLower.includes('時間') || insightsLower.includes('遅れ')) {
        suggestions.push({
            task: '作業時間の見積もり精度向上',
            estimatedMinutes: 30,
            reason: '時間管理の改善が必要と感じられたため',
            priority: 'medium',
            type: 'meta'
        });
    }

    if (insightsLower.includes('集中') || insightsLower.includes('効率')) {
        suggestions.push({
            task: '集中力向上のための環境整備',
            estimatedMinutes: 20,
            reason: '集中力や効率性の改善が必要と感じられたため',
            priority: 'medium',
            type: 'meta'
        });
    }

    if (insightsLower.includes('準備') || insightsLower.includes('計画')) {
        suggestions.push({
            task: '明日のタスクの詳細計画立案',
            estimatedMinutes: 25,
            reason: '事前準備の重要性が認識されたため',
            priority: 'high',
            type: 'planning'
        });
    }

    // 定期振り返り
    suggestions.push({
        task: '今日の振り返りと明日の計画',
        estimatedMinutes: 15,
        reason: '継続的な改善のため',
        priority: 'medium',
        type: 'routine'
    });

    // 過去の傾向からの提案
    if (dailyReviews.length >= 3) {
        const recentReviews = dailyReviews.slice(-3);
        const avgCompletionRate = recentReviews.reduce((sum, review) => 
            sum + (review.tasksCompleted / review.tasksTotal), 0) / recentReviews.length;

        if (avgCompletionRate < 0.7) {
            suggestions.push({
                task: 'タスク量の適正化検討',
                estimatedMinutes: 20,
                reason: `最近の完了率が${Math.round(avgCompletionRate * 100)}%と低めのため`,
                priority: 'high',
                type: 'optimization'
            });
        }
    }

    // 優先度順にソート
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return suggestions.slice(0, 5);
}

function displaySuggestions(suggestions) {
    suggestedTasks = suggestions;
    
    const container = document.getElementById('suggestionsContent');
    container.innerHTML = suggestions.map((suggestion, index) => {
        const priorityColor = {
            'high': '#ef4444',
            'medium': '#f59e0b', 
            'low': '#6b7280'
        };

        const typeEmoji = {
            'carryover': '🔄',
            'improvement': '⚡',
            'meta': '🧠',
            'planning': '📋',
            'routine': '📅',
            'optimization': '⚙️'
        };

        return `
            <div class="suggestion-item">
                <div class="suggestion-content">
                    <h5 class="suggestion-title">
                        ${typeEmoji[suggestion.type]} ${suggestion.task}
                        <span class="priority-badge priority-${suggestion.priority}">
                            ${suggestion.priority.toUpperCase()}
                        </span>
                    </h5>
                    <p class="suggestion-reason">
                        ${suggestion.reason}
                    </p>
                    <p class="suggestion-time">
                        見積もり時間: ${suggestion.estimatedMinutes}分
                    </p>
                </div>
                <input type="checkbox" id="suggestion-${index}" class="suggestion-checkbox" checked>
            </div>
        `;
    }).join('');

    document.getElementById('tomorrowSuggestions').classList.remove('hidden');
}

function addSuggestedTasks() {
    let addedCount = 0;
    
    suggestedTasks.forEach((suggestion, index) => {
        const checkbox = document.getElementById(`suggestion-${index}`);
        if (checkbox && checkbox.checked) {
            const newTask = {
                id: Date.now() + index,
                name: suggestion.task,
                estimatedMinutes: suggestion.estimatedMinutes,
                actualSeconds: 0,
                completed: false,
                createdAt: new Date().toISOString(),
                suggestedBy: 'ai',
                suggestionReason: suggestion.reason
            };
            
            tasks.push(newTask);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        saveData();
        updateDisplay();
        alert(`✅ ${addedCount}個のタスクを追加しました！`);
        
        document.getElementById('reviewSection').classList.add('hidden');
        document.getElementById('tomorrowSuggestions').classList.add('hidden');
        
        document.getElementById('todayAccomplishments').value = '';
        document.getElementById('todayIncomplete').value = '';
        document.getElementById('todayInsights').value = '';
    } else {
        alert('追加するタスクを選択してください');
    }
}

// 同期機能
function toggleSync() {
    const section = document.getElementById('syncSection');
    section.classList.toggle('hidden');
}

function exportData() {
    if (!masterPassword) {
        alert('パスワードが設定されていません');
        return;
    }

    const dataToExport = {
        tasks: tasks,
        dailyReviews: dailyReviews
    };
    const dataString = JSON.stringify(dataToExport);
    const encryptedData = encrypt(dataString, masterPassword);
    
    const exportContainer = document.getElementById('exportData');
    exportContainer.textContent = encryptedData;
    exportContainer.classList.remove('hidden');
    
    navigator.clipboard.writeText(encryptedData).then(() => {
        alert('📋 暗号化データをクリップボードにコピーしました！\n他のデバイスのインポート欄に貼り付けてください。');
    }).catch(() => {
        alert('💾 暗号化データを表示しました。手動でコピーして他のデバイスに貼り付けてください。');
    });
}

function importData() {
    const encryptedData = document.getElementById('importData').value.trim();
    const password = document.getElementById('decryptPassword').value;
    
    if (!encryptedData || !password) {
        alert('暗号化データとパスワードの両方を入力してください');
        return;
    }
    
    try {
        const decryptedData = decrypt(encryptedData, password);
        const importedData = JSON.parse(decryptedData);
        
        let importedTasks = [];
        let importedReviews = [];
        
        if (Array.isArray(importedData)) {
            importedTasks = importedData;
        } else {
            importedTasks = importedData.tasks || [];
            importedReviews = importedData.dailyReviews || [];
        }
        
        if (Array.isArray(importedTasks)) {
            if (tasks.length > 0 || dailyReviews.length > 0) {
                const merge = confirm('既存のデータに追加しますか？\n「OK」= 追加　「キャンセル」= 置き換え');
                if (merge) {
                    const maxId = Math.max(...tasks.map(t => t.id), 0);
                    importedTasks.forEach((task, index) => {
                        task.id = maxId + index + 1;
                    });
                    tasks = [...tasks, ...importedTasks];
                    dailyReviews = [...dailyReviews, ...importedReviews];
                } else {
                    tasks = importedTasks;
                    dailyReviews = importedReviews;
                }
            } else {
                tasks = importedTasks;
                dailyReviews = importedReviews;
            }
            
            saveData();
            updateDisplay();
            
            document.getElementById('importData').value = '';
            document.getElementById('decryptPassword').value = '';
            
            alert('✅ データのインポートが完了しました！');
        } else {
            alert('❌ 無効なデータ形式です');
        }
    } catch (error) {
        alert('❌ データの復号化に失敗しました。パスワードが正しいか確認してください。');
    }
}

function downloadBackup() {
    if (!masterPassword) {
        alert('パスワードが設定されていません');
        return;
    }

    const dataToBackup = {
        tasks: tasks,
        dailyReviews: dailyReviews
    };
    const dataString = JSON.stringify(dataToBackup);
    const encryptedData = encrypt(dataString, masterPassword);
    
    const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        data: encryptedData
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('📁 バックアップファイルをダウンロードしました！');
}

function loadBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const password = prompt('バックアップファイルの復号化パスワードを入力してください:');
    if (!password) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            const decryptedData = decrypt(backupData.data, password);
            const importedData = JSON.parse(decryptedData);
            
            let importedTasks = [];
            let importedReviews = [];
            
            if (Array.isArray(importedData)) {
                importedTasks = importedData;
            } else {
                importedTasks = importedData.tasks || [];
                importedReviews = importedData.dailyReviews || [];
            }
            
            if (Array.isArray(importedTasks)) {
                if (tasks.length > 0 || dailyReviews.length > 0) {
                    const merge = confirm('既存のデータに追加しますか？\n「OK」= 追加　「キャンセル」= 置き換え');
                    if (merge) {
                        const maxId = Math.max(...tasks.map(t => t.id), 0);
                        importedTasks.forEach((task, index) => {
                            task.id = maxId + index + 1;
                        });
                        tasks = [...tasks, ...importedTasks];
                        dailyReviews = [...dailyReviews, ...importedReviews];
                    } else {
                        tasks = importedTasks;
                        dailyReviews = importedReviews;
                    }
                } else {
                    tasks = importedTasks;
                    dailyReviews = importedReviews;
                }
                
                saveData();
                updateDisplay();
                alert('✅ バックアップファイルから復元しました！');
            } else {
                alert('❌ 無効なバックアップファイルです');
            }
        } catch (error) {
            alert('❌ バックアップファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// イベントリスナー
document.addEventListener('DOMContentLoaded', function() {
    // タスク名入力でEnterキー
    const taskNameInput = document.getElementById('taskName');
    if (taskNameInput) {
        taskNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    // パスワード確認でEnterキー
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                setupPassword();
            }
        });
    }
});

// 初期化
window.addEventListener('load', () => {
    const passwordSet = localStorage.getItem('timeTrackerPasswordSet');
    if (passwordSet) {
        const password = prompt('暗号化パスワードを入力してください:');
        if (password) {
            masterPassword = password;
            document.getElementById('passwordCard').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            loadData();
            updateDisplay();
        } else {
            localStorage.removeItem('timeTrackerPasswordSet');
        }
    }
});

// --- 国際化対応 (i18n) の準備 ---
const APP_VERSION = '1.1.0';
// アプリ内で使う全ての文字列をここにまとめる
const STRINGS = {
    ja: {
        // アラートメッセージ
        alertRecipeName: 'レシピ名を入力してください。',
        alertBeanAmount: '豆の量を入力してください。',
        alertDuplicateRecipe: '同じ名前のレシピが既に存在します。別の名前を付けてください。',
        alertInvalidBlock: 'すべての手順に、有効な名前、時間(1秒以上)、目標量(0g以上)を入力してください。',
        alertInvalidTemp: '温度には数値を入力してください。',
        alertNoBlocks: 'ドリップ手順を1つ以上追加してください。',
        alertRecipeSaved: 'レシピを保存しました！',
        alertRecipeUpdated: 'レシピを更新しました！',
        // プレースホルダー
        placeholderRecipeName: '例: 朝の一杯用',
        placeholderBeanAmount: '例: 20',
        placeholderBlockName: '手順名 (例: 蒸らし)',
        placeholderDuration: '時間',
        placeholderAmount: '目標量',
        placeholderTemp: '温度',
        placeholderComment: 'コメント (例: ゆっくりのの字で)',
        confirmDelete: 'このレシピを本当に削除しますか？',
        // UIテキスト
        newRecipeTitle: '新しいレシピ',
        editRecipeTitle: 'レシピを編集',
        mainTitle: 'コーヒータイマー',
        noRecipes: 'まだレシピがありません。最初のレシピを登録しましょう！',
        pourLabel: '投湯量',
        extractionLabel: '抽出量',
        timerStart: 'スタート',
        timerStop: 'ストップ',
        timerResume: '再開',
        dripFinish: 'ドリップ完了！お疲れ様でした！',
        timerCurrentAmount: '現在',
        timerTargetAmount: '目標量',
        temperatureLabel: '温度',
        dripEnd: '終わり',
        timerFinish: '終了',
        lastStepInfo: '最後の工程です',
        timerTotalTimeLabel: '目標時間',
        confirmReset: 'タイマーをリセットしますか？',
        alertTimerStopped: 'タイマーが29分59秒に達したため、自動的に停止しました。',
    },
    // 将来ここに en: { ... } を追加すれば英語対応できる
};
const S = STRINGS.ja; // 現在の言語を 'ja' に設定

// アプリの初期化処理をまとめる
function initializeApp() {
    console.log("コーヒードリップタイマー、起動！");

    // --- UIテキストの初期設定 ---
    document.getElementById('main-title').textContent = S.mainTitle;
    document.getElementById('recipe-name').placeholder = S.placeholderRecipeName;
    document.getElementById('bean-amount').placeholder = S.placeholderBeanAmount;
    document.getElementById('app-version-display').textContent = `v${APP_VERSION}`;

    // --- DOM要素の取得 ---
    // 画面のセクション
    const screens = {
        recipeList: document.getElementById('screen-recipe-list'),
        recipeSettings: document.getElementById('screen-recipe-settings'),
        dripTimer: document.getElementById('screen-drip-timer'),
    };

    // 操作するボタン
    const buttons = {
        addNewRecipe: document.getElementById('btn-add-new-recipe'),
        addBlock: document.getElementById('btn-add-block'),
        saveRecipe: document.getElementById('btn-save-recipe'),
        settingsBack: document.getElementById('btn-settings-back'),
        timerBack: document.getElementById('btn-timer-back'),
        timerReset: document.getElementById('btn-timer-reset'),
        timerStartStop: document.getElementById('btn-timer-start-stop'),
        cancelSettings: document.getElementById('btn-cancel-settings'),
        toggleSound: document.getElementById('btn-toggle-sound'),
        toggleTheme: document.getElementById('btn-toggle-theme'),
        showCredits: document.getElementById('btn-show-credits'),
        closeModal: document.getElementById('modal-close'),
    };

    // コンテナ
    const containers = {
        recipeList: document.getElementById('recipe-list-container'),
        settingsForm: document.getElementById('screen-recipe-settings'), // イベントリスナー用
        blocks: document.getElementById('blocks-container'),
        creditsModal: document.getElementById('credits-modal'),
    };

    // タイマー画面のDOM要素をキャッシュ
    const domTimer = {
        totalRecipeTime: document.getElementById('timer-total-recipe-time'),
        totalRecipeAmount: document.getElementById('timer-total-recipe-amount'),
        beanAmount: document.getElementById('timer-bean-amount'),
        recipeName: document.getElementById('timer-recipe-name'),
        totalTime: document.getElementById('timer-total-time'),
        blockName: document.getElementById('timer-current-block-name'),
        blockCountdown: document.getElementById('timer-block-countdown'),
        targetAmount: document.getElementById('timer-target-amount'),
        previousAmount: document.getElementById('timer-previous-amount'),
        stepAmount: document.getElementById('timer-step-amount'),
        blockComment: document.getElementById('timer-block-comment'),
        currentBlockTemp: document.getElementById('timer-current-block-temp'),
        nextBlockInfo: document.getElementById('timer-next-block-info'),
        startStopButton: document.getElementById('btn-timer-start-stop'),
    };

    // アプリの状態を管理する変数
    let editingRecipeId = null; // nullの場合は新規作成、IDが入っている場合は編集モード
    let activeRecipe = null; // タイマー画面で使うレシピ
    let timerInterval = null; // setIntervalのID
    let timerState = 'stopped'; // 'stopped', 'running', 'paused', 'finished'
    let totalElapsedTime = 0; // 合計経過時間
    let currentBlockIndex = 0; // 現在のブロックのインデックス
    let currentBlockTimeLeft = 0; // 現在のブロックの残り時間
    let isSoundEnabled = true; // サウンドが有効かどうかのフラグ
    let currentTheme = 'light'; // 'light' or 'dark'

    // --- データストレージのロジック (localStorage) ---
    const STORAGE_KEY = 'coffee-drip-timer-recipes';

    // localStorageからレシピ配列を取得する
    function getRecipesFromStorage() {
        const recipesJSON = localStorage.getItem(STORAGE_KEY);
        return recipesJSON ? JSON.parse(recipesJSON) : [];
    }

    // localStorageにレシピ配列を保存する
    function saveRecipesToStorage(recipes) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    }

    // --- 画面遷移のロジック ---
    function navigateTo(screenName) {
        // まずは全ての画面を隠す
        Object.values(screens).forEach(screen => {
            screen.hidden = true;
        });
        // 目的の画面だけを表示する
        if (screens[screenName]) {
            screens[screenName].hidden = false;
        }
    }

    // --- レシピ設定画面のロジック ---
    function addBlockForm(block = {}) {
        const blockId = `block-${Date.now()}`; // ユニークなIDを生成
        const newBlock = document.createElement('div');
        newBlock.className = 'block-form';
        newBlock.id = blockId;

        const tempUnit = document.querySelector('input[name="temp-unit"]:checked').value;
        const maxTemp = tempUnit === 'celsius' ? 100 : 212;

        const weightUnit = document.querySelector('input[name="weight-unit"]:checked').value;
        const weightStep = weightUnit === 'oz' ? '0.1' : '1';
        const tempUnitLabel = tempUnit === 'celsius' ? '℃' : '℉';

        newBlock.innerHTML = `
            <div class="form-group-inline">
                <input type="text" class="block-name" placeholder="${S.placeholderBlockName}" value="${block.name || ''}">
                <div class="input-with-unit">
                    <input type="number" class="block-duration" placeholder="${S.placeholderDuration}" value="${block.duration || ''}" min="1">
                    <span class="unit">秒</span>
                </div>
                <div class="input-with-unit">
                    <input type="number" class="block-amount" placeholder="${S.placeholderAmount}" value="${block.targetAmount || ''}" min="0" step="${weightStep}">
                    <span class="unit weight-unit-label">${weightUnit}</span>
                </div>
                <div class="input-with-unit">
                    <input type="number" class="block-temp" placeholder="${S.placeholderTemp}" max="${maxTemp}" value="${block.temperature === null ? '' : (block.temperature || maxTemp)}">
                    <span class="unit temp-unit-label">${tempUnitLabel}</span>
                </div>
                <button class="btn-delete-block" data-target-id="${blockId}">×</button>
            </div>
            <input type="text" class="block-comment" placeholder="${S.placeholderComment}" value="${block.comment || ''}">
        `;
        containers.blocks.appendChild(newBlock);
        newBlock.querySelector('.block-name').focus(); // 新しい手順名にフォーカス
    }

    // 設定画面のフォームをリセットする
    function resetSettingsForm() {
        document.getElementById('settings-title').textContent = S.newRecipeTitle;
        document.getElementById('recipe-name').value = '';
        document.getElementById('bean-amount').value = '';
        // 管理方法を「投湯量」にリセット
        document.querySelector('input[name="recipe-type"][value="pour"]').checked = true;
        // 温度単位を「℃」にリセット
        document.querySelector('input[name="temp-unit"][value="celsius"]').checked = true;
        // 重量単位を「g」にリセット
        document.querySelector('input[name="weight-unit"][value="g"]').checked = true;

        // ブロックを全て削除
        containers.blocks.innerHTML = '';
        // 新しい空のブロックを1つ追加
        addBlockForm();
        // 合計値表示もリセット
        updateRecipeSummary();
    }

    // 重量単位の変更に応じて、ラベルを更新する
    function updateWeightUnitLabels() {
        const weightUnit = document.querySelector('input[name="weight-unit"]:checked').value;
        const step = weightUnit === 'oz' ? '0.1' : '1';

        document.querySelector('label[for="bean-amount"]').textContent = `豆の量 (${weightUnit}):`;
        document.getElementById('bean-amount').step = step;

        containers.blocks.querySelectorAll('.weight-unit-label').forEach(label => {
            label.textContent = weightUnit;
        });
        containers.blocks.querySelectorAll('.block-amount').forEach(input => {
            input.step = step;
        });
    }

    function updateSummaryLabels() {
        const recipeType = document.querySelector('input[name="recipe-type"]:checked').value;
        const label = recipeType === 'pour' ? '総投湯量' : '総抽出量';
        document.getElementById('summary-amount-label').textContent = label;
    }

    // 温度単位の変更に応じて、既存の温度入力欄のmax値を更新する
    function updateTempInputMaxValues() {
        const tempUnit = document.querySelector('input[name="temp-unit"]:checked').value;
        const maxTemp = tempUnit === 'celsius' ? 100 : 212;
        const tempUnitLabel = tempUnit === 'celsius' ? '℃' : '℉';
        const tempInputs = containers.blocks.querySelectorAll('.block-temp');
        tempInputs.forEach(input => {
            input.max = maxTemp;
            const unitLabel = input.closest('.input-with-unit').querySelector('.temp-unit-label');
            if (unitLabel) {
                unitLabel.textContent = tempUnitLabel;
            }
        });
    }

    // 設定画面の合計時間・量をリアルタイムに計算して表示する
    function updateRecipeSummary() {
        const blockForms = Array.from(containers.blocks.querySelectorAll('.block-form'));
        let totalDuration = 0;
        let totalAmount = 0;

        blockForms.forEach(form => {
            const duration = parseInt(form.querySelector('.block-duration').value, 10) || 0;
            totalDuration += duration;
            // 各手順の投入量を合計する
            const amount = parseFloat(form.querySelector('.block-amount').value) || 0;
            totalAmount += amount;
        });

        const weightUnit = document.querySelector('input[name="weight-unit"]:checked').value;
        // ozの時は小数点第1位まで表示、gの時は整数で表示
        const displayAmount = formatWeight(totalAmount, weightUnit);
        const minutes = Math.floor(totalDuration / 60);
        const seconds = totalDuration % 60;

        document.getElementById('summary-total-time').textContent = `${minutes}分${seconds}秒`;
        document.getElementById('summary-total-amount').textContent = `${displayAmount}${weightUnit}`;
    }

    // 指定されたIDのレシピを編集するためにフォームを準備する
    function startEdit(recipeId) {
        const recipes = getRecipesFromStorage();
        const recipeToEdit = recipes.find(recipe => recipe.id === recipeId);

        if (!recipeToEdit) {
            console.error('編集するレシピが見つかりません。');
            return;
        }

        // 編集モードに設定
        editingRecipeId = recipeId;

        // フォームに既存のデータを設定
        document.getElementById('settings-title').textContent = S.editRecipeTitle;
        document.getElementById('recipe-name').value = recipeToEdit.name;
        document.getElementById('bean-amount').value = recipeToEdit.beanAmount;
        document.querySelector(`input[name="recipe-type"][value="${recipeToEdit.type}"]`).checked = true;
        document.querySelector(`input[name="temp-unit"][value="${recipeToEdit.tempUnit || 'celsius'}"]`).checked = true;
        document.querySelector(`input[name="weight-unit"][value="${recipeToEdit.weightUnit || 'g'}"]`).checked = true;

        // 既存のブロックをフォームに描画
        containers.blocks.innerHTML = ''; // まずは空にする
        let lastAmount = 0;
        recipeToEdit.blocks.forEach(block => {
            // 保存されている累計量から、このステップでの投入量を計算
            const stepAmount = block.targetAmount - lastAmount;
            const weightUnit = recipeToEdit.weightUnit || 'g';
            // フォーム表示用に、ステップごとの投入量を持つ新しいオブジェクトを作成
            const blockForForm = {
                ...block,
                targetAmount: formatWeight(stepAmount, weightUnit),
            };
            addBlockForm(blockForForm);
            lastAmount = block.targetAmount; // 次の計算のために今回の累計量を保存
        });

        // 編集開始時に合計値を計算して表示
        updateRecipeSummary();
        navigateTo('recipeSettings');
        updateSummaryLabels();
    }

    // --- 画面スリープ & サウンド管理 ---
    let wakeLock = null; // 画面スリープ防止用
    const THEME_STORAGE_KEY = 'coffee-drip-timer-theme';
    const SOUND_STORAGE_KEY = 'coffee-drip-timer-sound-enabled';
    const sounds = {
        countdown: new Audio('audio/countdown.mp3'),
        stepComplete: new Audio('audio/step_complete.mp3'),
        timerFinish: new Audio('audio/timer_finish.mp3'),
        start: new Audio('audio/start.mp3'),
        pause: new Audio('audio/pause.mp3'),
        resume: new Audio('audio/resume.mp3'),
        reset: new Audio('audio/reset.mp3'),
    };

    // アプリのサウンドを事前に読み込んでおく
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.volume = 0.5; // アプリ全体の音量を50%に設定
    });

    function playSound(soundName) {
        if (!isSoundEnabled) return; // サウンドがオフなら何もしない
        if (sounds[soundName]) {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.error("サウンドの再生に失敗しました:", e));
        }
    }

    // サウンドボタンのアイコンを更新する
    function updateSoundButtonIcon() {
        const iconOn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
        const iconOff = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>`;
        buttons.toggleSound.innerHTML = isSoundEnabled ? iconOn : iconOff;
    }

    // サウンド設定を切り替える
    function toggleSound() {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem(SOUND_STORAGE_KEY, isSoundEnabled);
        updateSoundButtonIcon();
    }

    // テーマボタンのアイコンを更新する
    function updateThemeButtonIcon() {
        const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.64 5.64c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.64 4.22c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41zm12.73 12.73c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41zM4.22 18.36c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41zm14.14-14.14c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41z"></path></svg>`;
        const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.3 4.9c.4-.2.6-.7.4-1.1-.2-.4-.7-.6-1.1-.4-3.8.9-6.6 4.3-6.6 8.5 0 4.8 3.9 8.8 8.8 8.8 3.6 0 6.8-2.2 8.1-5.4.2-.4 0-.9-.4-1.1-.4-.2-.9 0-1.1.4-1 2.5-3.5 4.2-6.5 4.2-3.9 0-7-3.1-7-7 0-3.5 2.5-6.4 5.9-6.9z"></path></svg>`;
        buttons.toggleTheme.innerHTML = currentTheme === 'light' ? moonIcon : sunIcon;
    }

    // テーマ設定を切り替える
    function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        updateThemeButtonIcon();
    }

    // アプリ起動時にテーマ設定を読み込む
    function loadThemeSetting() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
        currentTheme = savedTheme;
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        updateThemeButtonIcon();
    }

    // アプリ起動時にサウンド設定を読み込む
    function loadSoundSetting() {
        const savedSetting = localStorage.getItem(SOUND_STORAGE_KEY);
        isSoundEnabled = savedSetting === null ? true : JSON.parse(savedSetting);
        updateSoundButtonIcon();
    }

    // 画面スリープを防止する
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('画面スリープを防止します。');
                // タブが非表示になった時などに自動で解除されるので、それをハンドル
                wakeLock.addEventListener('release', () => {
                    console.log('画面スリープ防止が解除されました。');
                    wakeLock = null;
                });
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    }

    // 画面スリープ防止を解除する
    async function releaseWakeLock() {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
        }
    }

    // 渡された秒数を mm:ss 形式の文字列に変換する
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    // 重量を単位に合わせてフォーマットする（ozは小数点第1位、gは整数）
    function formatWeight(amount, unit) {
        if (unit === 'oz') {
            return parseFloat(amount.toFixed(1));
        }
        return Math.round(amount);
    }

    // 1秒ごとに実行されるタイマーのメイン処理
    function tick() {
        totalElapsedTime++;
        domTimer.totalTime.textContent = formatTime(totalElapsedTime);

        // 安全装置: 29分59秒（1799秒）で強制停止
        if (totalElapsedTime >= 1799) {
            stopTimer();
            alert(S.alertTimerStopped);
            return;
        }

        // タイマーが実行中の場合のみ、ブロックの時間を減らす
        if (timerState === 'running') {
            currentBlockTimeLeft--;
            domTimer.blockCountdown.textContent = formatTime(currentBlockTimeLeft);

            // 残り5秒からカウントダウン音を鳴らす
            if (currentBlockTimeLeft > 0 && currentBlockTimeLeft <= 5) {
                playSound('countdown');
            }

            // 現在のブロックが終了したかチェック
            if (currentBlockTimeLeft <= 0) {
                currentBlockIndex++;
                if (currentBlockIndex < activeRecipe.blocks.length) {
                    // 次のブロックへ
                    playSound('stepComplete');
                    const nextBlock = activeRecipe.blocks[currentBlockIndex];
                    currentBlockTimeLeft = nextBlock.duration;
                    updateTimerBlockDisplay();
                } else {
                    // 全てのブロックが終了
                    playSound('timerFinish');
                    timerState = 'finished';
                    domTimer.blockName.textContent = S.dripEnd;
                    domTimer.blockCountdown.textContent = '';
                    domTimer.startStopButton.textContent = S.timerFinish;
                    domTimer.nextBlockInfo.textContent = S.dripFinish;
                }
            }
        }
    }

    function startTimer() {
        // 停止状態からの開始
        if (timerState === 'stopped') {
            playSound('start'); // スタート音
            totalElapsedTime = 0;
            currentBlockIndex = 0;
            const firstBlock = activeRecipe.blocks[0];
            currentBlockTimeLeft = firstBlock.duration;
            updateTimerBlockDisplay();
            timerInterval = setInterval(tick, 1000);
            // スリープ防止を開始
            requestWakeLock();
        } else if (timerState === 'paused') {
            playSound('resume'); // 再開音
        }

        // 実行中は何もしない
        if (timerState === 'running') return;

        timerState = 'running';
        domTimer.startStopButton.textContent = S.timerStop;
    }

    function pauseTimer() {
        if (timerState !== 'running') return;
        playSound('pause'); // 一時停止音
        timerState = 'paused';
        domTimer.startStopButton.textContent = S.timerResume;
    }

    function stopTimer(shouldResetDisplay = true) {
        // スリープ防止を解除
        releaseWakeLock();

        timerState = 'stopped';
        domTimer.startStopButton.textContent = S.timerStart;
        clearInterval(timerInterval);
        timerInterval = null;
        if (shouldResetDisplay) {
            renderTimerScreen(); // タイマー表示を初期状態に戻す
        }
    }

    function resetTimer() {
        if (confirm(S.confirmReset)) {
            playSound('reset'); // リセット音
            stopTimer();
        }
    }

    // タイマー画面をレシピ情報で初期化・描画する
    function updateTimerBlockDisplay() {
        if (!activeRecipe) return;
        const block = activeRecipe.blocks[currentBlockIndex];
        if (!block) return; // レシピの最後に到達した場合など
        const prevBlock = currentBlockIndex > 0 ? activeRecipe.blocks[currentBlockIndex - 1] : null;
        const nextBlock = activeRecipe.blocks[currentBlockIndex + 1];

        const weightUnit = activeRecipe.weightUnit || 'g';
        const tempUnit = activeRecipe.tempUnit || 'celsius';
        const tempUnitLabel = tempUnit === 'celsius' ? '℃' : '℉';

        // 現在のブロック情報を更新
        domTimer.blockName.textContent = block.name;
        domTimer.blockCountdown.textContent = formatTime(block.duration);

        // 累計量の表示を更新
        const stepLabel = activeRecipe.type === 'pour' ? S.pourLabel : S.extractionLabel;
        const previousAmount = prevBlock ? prevBlock.targetAmount : 0;
        const stepAmount = block.targetAmount - previousAmount;
        const displayPreviousAmount = formatWeight(previousAmount, weightUnit);
        const displayStepAmount = formatWeight(stepAmount, weightUnit);
        const displayTargetAmount = formatWeight(block.targetAmount, weightUnit);
        domTimer.previousAmount.textContent = `${S.timerCurrentAmount}: ${displayPreviousAmount}${weightUnit}`;
        domTimer.stepAmount.textContent = `${stepLabel}: ${displayStepAmount}${weightUnit}`;
        domTimer.targetAmount.textContent = `${S.timerTargetAmount}: ${displayTargetAmount}${weightUnit}`;
        domTimer.blockComment.textContent = block.comment || '';
        domTimer.currentBlockTemp.textContent = block.temperature ? `${S.temperatureLabel}: ${block.temperature}${tempUnitLabel}` : '';

        // 次のブロック情報を更新
        if (nextBlock) {
            // 次の手順で投入する量を計算 (次の手順の累計量 - 現在の手順の累計量)
            const currentCumulativeAmount = block.targetAmount;
            const nextStepAmount = nextBlock.targetAmount - currentCumulativeAmount;
            const displayNextStepAmount = formatWeight(nextStepAmount, weightUnit);

            let nextInfo = `${nextBlock.name} (${nextBlock.duration}秒 / ${displayNextStepAmount}${weightUnit})`;
            if (nextBlock.temperature) {
                nextInfo += ` / ${nextBlock.temperature}${tempUnitLabel}`;
            }
            if (nextBlock.comment) {
                nextInfo += ` / 「${nextBlock.comment}」`;
            }
            domTimer.nextBlockInfo.textContent = nextInfo;
        } else {
            domTimer.nextBlockInfo.textContent = S.lastStepInfo;
        }
    }

    // ドリップを開始するためにタイマー画面を準備する
    function startDrip(recipeId) {
        if (timerState !== 'stopped') {
            stopTimer();
        }
        const recipes = getRecipesFromStorage();
        activeRecipe = recipes.find(recipe => recipe.id === recipeId);
        renderTimerScreen();
        navigateTo('dripTimer');
    }

    // レシピ一覧を画面に描画する
    function renderTimerScreen() {
        if (!activeRecipe) return;

        const weightUnit = activeRecipe.weightUnit || 'g';
        const totalRecipeDuration = activeRecipe.blocks.reduce((sum, block) => sum + block.duration, 0);
        const totalRecipeAmount = activeRecipe.blocks.length > 0 ? activeRecipe.blocks[activeRecipe.blocks.length - 1].targetAmount : 0;
        const displayAmount = formatWeight(totalRecipeAmount, weightUnit);
        const typeLabel = activeRecipe.type === 'pour' ? S.pourLabel : S.extractionLabel;
        const totalLabel = `総${typeLabel}`;

        // タイトル部の表示を更新
        domTimer.recipeName.textContent = activeRecipe.name;
        domTimer.beanAmount.textContent = `豆: ${activeRecipe.beanAmount}${weightUnit}`;
        domTimer.totalRecipeTime.textContent = `${S.timerTotalTimeLabel}: ${formatTime(totalRecipeDuration)}`;
        domTimer.totalRecipeAmount.textContent = `${totalLabel}: ${displayAmount}${weightUnit}`;

        // 合計時間を0にリセット
        domTimer.totalTime.textContent = formatTime(0);

        // 最初のブロック情報を表示
        currentBlockIndex = 0;
        updateTimerBlockDisplay();
    }

    // レシピ一覧を画面に描画する
    function renderRecipeList() {
        const recipes = getRecipesFromStorage();
        // コンテナを一度空にする
        containers.recipeList.innerHTML = '';

        if (recipes.length === 0) {
            containers.recipeList.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h14v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                    <p>${S.noRecipes}</p>
                </div>
            `;
            return;
        }

        recipes.forEach(recipe => {
            const li = document.createElement('li');
            li.className = 'recipe-item';
            li.dataset.recipeId = recipe.id;
            const weightUnit = recipe.weightUnit || 'g';

            const beanIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.8,6.2C14.2,5,13.1,4,12,4S9.8,5,9.2,6.2C8.5,7.9,8,9.8,8,12s0.5,4.1,1.2,5.8C9.8,19,10.9,20,12,20s2.2-1,2.8-2.2 C15.5,16.1,16,14.2,16,12S15.5,7.9,14.8,6.2z"/></svg>`;
            const typeIcon = recipe.type === 'pour'
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-200v-520L120-880h600v120h80q33 0 56.5 23.5T880-680v200q0 33-23.5 56.5T800-400h-80v200H240Zm80-80h320v-520H280l40 52v468Zm400-200h80v-200h-80v200ZM480-320h120v-440H480v440ZM120-80v-80h720v80H120Zm340-460Z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h14v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
            const typeLabel = recipe.type === 'pour' ? S.pourLabel : S.extractionLabel;

            li.innerHTML = `
                <div class="recipe-item-main">
                    <span class="recipe-item-name">${recipe.name}</span>
                    <div class="recipe-item-details">
                        <span class="recipe-detail-tag">${beanIcon} ${recipe.beanAmount}${weightUnit}</span>
                        <span class="recipe-detail-tag">${typeIcon} ${typeLabel}</span>
                    </div>
                </div>
                <div class="recipe-item-actions">
                    <button class="btn-edit">編集</button>
                    <button class="btn-delete">削除</button>
                </div>
            `;
            containers.recipeList.appendChild(li);
        });
    }

    // 現在のフォームの内容をレシピとして保存する
    function saveCurrentRecipe() {
        const recipeNameInput = document.getElementById('recipe-name');
        const recipeName = recipeNameInput.value.trim();
        const beanAmount = parseFloat(document.getElementById('bean-amount').value);
        const recipeType = document.querySelector('input[name="recipe-type"]:checked').value;
        const tempUnit = document.querySelector('input[name="temp-unit"]:checked').value;
        const weightUnit = document.querySelector('input[name="weight-unit"]:checked').value;

        // バリデーション: レシピ名が空じゃないかチェック
        if (!recipeName) {
            alert(S.alertRecipeName);
            recipeNameInput.focus();
            return;
        }

        // バリデーション: 豆の量が入力されているかチェック
        if (isNaN(beanAmount) || beanAmount <= 0) {
            alert(S.alertBeanAmount);
            document.getElementById('bean-amount').focus();
            return;
        }

        const allRecipes = getRecipesFromStorage();
        // 重複チェック。ただし、自分自身のレシピ名はチェック対象から外す（編集モード用）
        const isDuplicate = allRecipes.some(
            recipe => recipe.name === recipeName && recipe.id !== editingRecipeId
        );

        if (isDuplicate) {
            alert(S.alertDuplicateRecipe);
            recipeNameInput.focus();
            return;
        }

        // 各ブロックの入力値を取得してバリデーション
        const blockForms = containers.blocks.querySelectorAll('.block-form');
        const blocks = [];
        let cumulativeAmount = 0;
        for (const form of blockForms) {
            const name = form.querySelector('.block-name').value.trim();
            const duration = parseInt(form.querySelector('.block-duration').value, 10);
            const amount = parseFloat(form.querySelector('.block-amount').value);
            const tempInput = form.querySelector('.block-temp').value;
            let temperature = tempInput ? parseInt(tempInput, 10) : null;
            const comment = form.querySelector('.block-comment').value.trim();

            // 内部データとしては、累計量を計算して保存する
            cumulativeAmount += amount;

            // 温度が最大値の場合、温度管理なし（null）として扱う
            if (
                (tempUnit === 'celsius' && temperature === 100) ||
                (tempUnit === 'fahrenheit' && temperature === 212)
            ) {
                temperature = null;
            }

            // 入力値が有効かチェック
            if (!name || isNaN(duration) || duration <= 0 || isNaN(amount) || amount < 0) {
                alert(S.alertInvalidBlock);
                form.querySelector('.block-name').focus(); // 問題のあったフォームにフォーカス
                return;
            }
            // 温度が入力されている場合、それが数値であるかチェック
            if (tempInput && isNaN(temperature)) {
                alert(S.alertInvalidTemp);
                form.querySelector('.block-temp').focus();
                return;
            }
            blocks.push({
                id: `block-${Date.now()}-${blocks.length}`, // 簡易的なユニークID
                name,
                duration,
                targetAmount: cumulativeAmount, // 累計量を保存
                temperature,
                comment
            });
        }

        if (blocks.length === 0) {
            alert(S.alertNoBlocks);
            return;
        }

        if (editingRecipeId) {
            // --- 更新モード ---
            const updatedRecipes = allRecipes.map(recipe => {
                if (recipe.id === editingRecipeId) {
                    // 見つかったレシピを新しい内容で上書き
                    return { ...recipe, name: recipeName, beanAmount, type: recipeType, tempUnit, weightUnit, blocks: blocks };
                }
                return recipe; // 他のレシピはそのまま
            });
            saveRecipesToStorage(updatedRecipes);
            alert(S.alertRecipeUpdated);
        } else {
            // --- 新規作成モード ---
            const newRecipe = {
                id: `recipe-${Date.now()}`,
                name: recipeName,
                beanAmount,
                type: recipeType,
                weightUnit,
                tempUnit,
                blocks: blocks
            };
            allRecipes.push(newRecipe);
            saveRecipesToStorage(allRecipes);
            alert(S.alertRecipeSaved);
        }

        navigateTo('recipeList');
        renderRecipeList(); // 一覧を再描画
    }

    // --- イベントリスナーの設定 ---
    // 「+」ボタンを押したら、設定画面に移動
    buttons.addNewRecipe.addEventListener('click', () => {
        editingRecipeId = null; // 新規作成モードに設定
        resetSettingsForm(); // フォームをリセット
        navigateTo('recipeSettings');
    });

    // 「キャンセル」ボタンを押したら、レシピ一覧に戻る
    buttons.cancelSettings.addEventListener('click', () => navigateTo('recipeList'));

    // 設定画面の「戻る」ボタン
    buttons.settingsBack.addEventListener('click', () => navigateTo('recipeList'));

    // タイマー画面の「戻る」ボタン
    buttons.timerBack.addEventListener('click', () => {
        if (timerState !== 'stopped') {
            stopTimer();
        }
        navigateTo('recipeList');
    });

    // 「手順を追加」ボタンを押したら、ブロック入力フォームを追加
    buttons.addBlock.addEventListener('click', addBlockForm);

    // 「保存」ボタンを押したら、レシピを保存
    buttons.saveRecipe.addEventListener('click', saveCurrentRecipe);

    // --- モーダル関連のイベントリスナー ---
    // 「サウンドクレジット」ボタンを押したらモーダルを表示
    buttons.showCredits.addEventListener('click', () => {
        containers.creditsModal.classList.add('is-open');
    });
    // モーダルの閉じるボタン
    buttons.closeModal.addEventListener('click', () => {
        containers.creditsModal.classList.remove('is-open');
    });

    // サウンド切り替えボタン
    buttons.toggleSound.addEventListener('click', toggleSound);

    // テーマ切り替えボタン
    buttons.toggleTheme.addEventListener('click', toggleTheme);

    // タイマーのリセットボタン
    buttons.timerReset.addEventListener('click', resetTimer);

    // タイマーの「スタート/ストップ」ボタン
    buttons.timerStartStop.addEventListener('click', () => {
        if (timerState === 'running') {
            pauseTimer();
        } else if (timerState === 'finished') {
            stopTimer(false); // 画面表示はリセットしない
        } else {
            startTimer();
        }
    });

    // 温度単位が変更されたら、入力欄のmax値を更新
    containers.settingsForm.addEventListener('change', (event) => {
        if (event.target.name === 'temp-unit') {
            updateTempInputMaxValues();
        }
        if (event.target.name === 'weight-unit') {
            updateWeightUnitLabels();
        }
        if (event.target.name === 'recipe-type') {
            updateSummaryLabels();
        }
    });

    // イベントデリゲーションを使って、動的に追加されるブロックの削除ボタンに対応
    containers.blocks.addEventListener('click', (event) => {
        // クリックされたのが削除ボタン（.btn-delete-block）かチェック
        if (event.target.classList.contains('btn-delete-block')) {
            const targetId = event.target.dataset.targetId;
            const blockToRemove = document.getElementById(targetId);
            if (blockToRemove) {
                blockToRemove.remove();
                // ブロック削除後に合計値を再計算
                updateRecipeSummary();
            }
        }
    });

    // イベントデリゲーションを使って、手順入力中の変更を検知し、合計値を更新
    containers.blocks.addEventListener('input', (event) => {
        if (event.target.classList.contains('block-duration') || event.target.classList.contains('block-amount')) {
            updateRecipeSummary();
        }
    });

    // イベントデリゲーションを使って、レシピ一覧の操作（編集・削除）に対応
    containers.recipeList.addEventListener('click', (event) => {
        const recipeItem = event.target.closest('.recipe-item');
        if (!recipeItem) {
            return; // レシピ項目以外の場所がクリックされた場合は何もしない
        }

        const recipeId = recipeItem.dataset.recipeId;

        // 「削除」ボタンが押された場合
        if (event.target.classList.contains('btn-delete')) {
            // ユーザーに最終確認をする
            if (confirm(S.confirmDelete)) {
                const recipes = getRecipesFromStorage();
                const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
                saveRecipesToStorage(updatedRecipes);
                renderRecipeList(); // 画面を再描画して変更を反映
            }
        } else if (event.target.classList.contains('btn-edit')) {
            // 「編集」ボタンが押された場合
            startEdit(recipeId);
        } else {
            // 編集・削除ボタン以外（レシピ項目本体）がクリックされた場合
            startDrip(recipeId);
        }
    });

    // モーダルの外側をクリックしても閉じるようにする
    containers.creditsModal.addEventListener('click', (event) => {
        if (event.target === containers.creditsModal) {
            containers.creditsModal.classList.remove('is-open');
        }
    });

    // アプリ起動時にレシピ一覧を初回描画
    renderRecipeList();

    // アプリ起動時に単位表示を初期化
    updateWeightUnitLabels();

    // アプリ起動時にサマリーのラベルを初期化
    updateSummaryLabels();

    // アプリ起動時にサウンド設定を読み込んでボタンに反映
    loadSoundSetting();

    // アプリ起動時にテーマ設定を読み込んでボタンに反映
    loadThemeSetting();
}

// DOMの読み込みが完了したらアプリを初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// Service Workerを登録する
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
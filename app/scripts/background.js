const EXTENSION_ID = 'ggofbbndaeneibofhcakocmknlcoleaa'
let programList = []
let isRepeat = false
let isSound = false
let isPlay = false
let timer = null

/**
 * プログラムタイマーのプログラム要素
 */
class SettingProgram {
  constructor (time, defaultTime, token) {
    this.time = time
    this.defaultTime = defaultTime
    this.token = token
  }
}

/**
 * Popupからのリクエスト受信
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  let response = {}

  switch (request.type) {
    case 'get':
      updateView()
      break
    case 'insert':
      let settingProgram = new SettingProgram(request.time, request.defaultTime, request.token)
      programList.push(settingProgram)
      updateView()
      break
    case 'delete':
      for (let i in programList) {
        if (programList[i].token === request.token) {
          programList.splice(i, 1)
        }
      }
      updateView()
      break
    case 'order':
      let program = programList[request['oldIndex']];
      programList.splice(request['oldIndex'], 1)
      programList.splice(request['newIndex'], 0, program);
      break
    case 'repeat':
      isRepeat = request.isRepeat
      break
    case 'sound':
      isSound = request.isSound
      break
    case 'start':
      startTimer()
      break
    case 'end':
      stopTimer()
      break
    case 'reset':
      resetTimer()
      break
  }
  sendResponse(response)
})

/**
 * タイマー更新
 */
function updateTimer () {
  let currentRap = getCurrentRap()

  let updateComplete = false
  if (currentRap.currentSecond > 0) {
    currentRap.currentSecond--
    updateComplete = true
  }
  if (!updateComplete && currentRap.currentMinute > 0) {
    currentRap.currentMinute--
    currentRap.currentSecond = 59
    updateComplete = true
  }
  if (!updateComplete) {
    currentRap.currentHour--
    currentRap.currentMinute = 59
    currentRap.currentSecond = 59
  }

  const targetProgram = programList[currentRap.currentProgram]
  targetProgram.time.hour = currentRap.currentHour
  targetProgram.time.minute = currentRap.currentMinute
  targetProgram.time.second = currentRap.currentSecond

  const updateParam = {
    type: 'updateTime',
    currentRap: currentRap
  }

  chrome.runtime.sendMessage(EXTENSION_ID, updateParam)
  // chrome.runtime.sendMessage(updateParam)

  // 0秒になったか
  const isZero = currentRap.currentHour === 0 && currentRap.currentMinute === 0 && currentRap.currentSecond === 0
  if (isZero) {
    let message = 'Finished : ' + currentRap.currentDefaultTime + '\n'
    if (currentRap.nextDefaultTime) {
      message += 'Next : ' + currentRap.nextDefaultTime
    }
    // ポップアップを表示する
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../images/icon-32.png',
      title: 'Good Job !',
      message: message,
      requireInteraction: false,
      silent: true,
      priority: 0
    })
    // アラームを鳴らす
    if (isSound) {
      play()
    }
    // タイマーを止める
    if (currentRap.currentProgram === programList.length - 1) {
      if (isRepeat) {
        resetTimer()
      } else {
        stopTimer()
      }
    }
  }
}

function getCurrentRap () {
  let currentProgram = 0
  let currentHour = 0
  let currentMinute = 0
  let currentSecond = 0
  let currentToken = ''

  let currentDefaultTime = ''
  let nextDefaultTime = ''

  for (let i in programList) {
    if (programList[i]) {
      const program = programList[i]
      currentHour = program.time.hour
      currentMinute = program.time.minute
      currentSecond = program.time.second
      currentToken = program.token
      currentProgram = parseInt(i)
      currentDefaultTime = zeroPadding(program.defaultTime.hour) + ':' + zeroPadding(program.defaultTime.minute) + ':' + zeroPadding(program.defaultTime.second)

      if (programList.length - 1 > parseInt(i)) {
        let nextProgram = programList[parseInt(i) + 1]
        nextDefaultTime = zeroPadding(nextProgram.defaultTime.hour) + ':' + zeroPadding(nextProgram.defaultTime.minute) + ':' + zeroPadding(nextProgram.defaultTime.second)
      } else if (isRepeat) {
        let nextProgram = programList[0]
        nextDefaultTime = zeroPadding(nextProgram.defaultTime.hour) + ':' + zeroPadding(nextProgram.defaultTime.minute) + ':' + zeroPadding(nextProgram.defaultTime.second)
      } else {
        nextDefaultTime = ''
      }

      if (currentHour !== 0 || currentMinute !== 0 || currentSecond !== 0) {
        break
      }
    }
  }

  const result = {
    'currentProgram': currentProgram,
    'currentHour': currentHour,
    'currentMinute': currentMinute,
    'currentSecond': currentSecond,
    'currentToken': currentToken,
    'currentDefaultTime': currentDefaultTime,
    'nextDefaultTime': nextDefaultTime
  }

  return result
}

function startTimer () {
  if (timer) {
    return
  }
  isPlay = true
  timer = window.setInterval(updateTimer, 1000)
  chrome.browserAction.setBadgeText({text: 'ON'})
  chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'})
  updateView()
}

function stopTimer () {
  clearInterval(timer)
  timer = null
  isPlay = false
  chrome.browserAction.setBadgeText({text: 'OFF'})
  chrome.browserAction.setBadgeBackgroundColor({color: '#b3b3b4'})
  updateView()
}

function resetTimer () {
  for (let i in programList) {
    const program = programList[i]
    program.time.hour = program.defaultTime.hour
    program.time.minute = program.defaultTime.minute
    program.time.second = program.defaultTime.second
  }
  updateView()
}

function updateView () {
  const param = {
    type: 'updateView',
    programList: programList,
    isRepeat: isRepeat,
    isSound: isSound,
    isPlay: isPlay
  }
  chrome.runtime.sendMessage(EXTENSION_ID, param)
  // chrome.runtime.sendMessage(param)
}

// 0埋め処理
function zeroPadding (num) {
  return ('0' + num).slice(-2)
}

// 音声再生
function play () {
  const element = document.createElement('audio')
  const source = element.appendChild(document.createElement('source'))
  source.setAttribute('src', '../sounds/default.mp3')
  element.appendChild(source)
  document.body.appendChild(element)
  element.play()
    .then(function (result) {

    })
    .catch(function (exception) {

    })
    .finally(function (result) {

    })
}

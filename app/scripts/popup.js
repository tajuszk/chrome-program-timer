import $ from 'jquery'
import Sortable from 'sortablejs'

const EXTENSION_ID = 'ggofbbndaeneibofhcakocmknlcoleaa'
let sortableList = null

init()
let param = {
  type: 'get'
}
chrome.runtime.sendMessage(EXTENSION_ID, param)

/**
 * Init
 */
function init () {
  // 設定した時間を表示するリストを作成
  const el = $('#items')[0]
  sortableList = Sortable.create(el, {
    animation: 150,
    onUpdate: function (evt) {
      let param = {
        type: 'order',
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex,
      }
      chrome.runtime.sendMessage(EXTENSION_ID, param)
    }
  })
  initInputField()
  initController()

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'updateTime') {
      // 数値を更新する
      const currentRap = request.currentRap
      const time = setTime(currentRap.currentHour, currentRap.currentMinute, currentRap.currentSecond)
      const timeText = zeroPadding(time.hour) + ':' + zeroPadding(time.minute) + ':' + zeroPadding(time.second)
      $('#' + currentRap.currentToken + ' span').text(timeText)
    }
    if (request.type === 'updateView') {
      // 数値を更新する
      updateView(request)
    }
    sendResponse({})
  })
}

/**
 * InitInputField
 */
function initInputField () {
  $('.input-field input').on('input', function () {
    insertCheck()
  })
  // 時間を増やす
  $('.up').on('click', (e) => up(e))
  // 時間を減らす
  $('.down').on('click', (e) => down(e))
}

/**
 * InitController
 */
function initController () {
  // Startボタン
  $('#startBtn').on('click', function () {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: 'start' })
  })

  // Stopボタン
  $('#stopBtn').on('click', function () {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: 'end' })
  })

  // Resetボタン
  $('#resetBtn').on('click', function () {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: 'reset' })
  })

  // Repeatボタン
  $('#repeat').on('change', function (e) {
    let param = {
      type: 'repeat',
      isRepeat: e.currentTarget.checked
    }
    chrome.runtime.sendMessage(EXTENSION_ID, param)
  })
}

/**
 * updateView
 */
function updateView (responseData) {
  let programList = responseData.programList
  $('#repeat').prop('checked', responseData.isRepeat)

  $('#items').empty()
  if (programList.length === 0) {
    $('.controller').removeClass('is-show')
  } else {
    $('.controller').addClass('is-show')
  }

  for (let i in programList) {
    if (programList.hasOwnProperty(i)) {
      const program = programList[i]
      const time = setTime(program.time.hour, program.time.minute, program.time.second)
      const timeText = zeroPadding(time.hour) + ':' + zeroPadding(time.minute) + ':' + zeroPadding(time.second)
      const token = program.token
      const timer = '<li id="' + token + '" class="timer"><span>' + timeText + '</span><div class="close icon"></div></li>'
      $('#items').append(timer)
      // 削除の処理を定義しておく
      $('#' + token + ' .close').on('click', function () {
        const param = {
          type: 'delete',
          token: token
        }
        chrome.runtime.sendMessage(EXTENSION_ID, param)
      })
    }
  }

  $('.up').off('click')
  $('.down').off('click')
  $('#setBtn').off('click')
  $('#startBtn').off('click')
  $('#stopBtn').off('click')
  $('#resetBtn').off('click')
  if (responseData.isPlay) {
    $('.btn-layout').addClass('disabled')
    $('#setBtn').removeClass('filled')
    $('.close.icon').addClass('disabled')
    $('.input-field div').addClass('disabled')
    $('.program li').addClass('disabled')
    $('.input-field input').prop('disabled', true)
    sortableList.option('disabled', true)

    $('#repeat').prop('disabled', true)
    $('#startBtn').addClass('disabled')
    $('#stopBtn').removeClass('disabled')
    $('#resetBtn').addClass('disabled')

    $('#stopBtn').on('click', function () {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'end' })
    })
  } else {
    $('.btn-layout').removeClass('disabled')
    $('.close.icon').removeClass('disabled')
    $('.input-field div').removeClass('disabled')
    $('.program li').removeClass('disabled')
    $('.input-field input').prop('disabled', false)
    sortableList.option('disabled', false)

    $('#repeat').prop('disabled', false)
    $('#stopBtn').addClass('disabled')

    $('.up').on('click', (e) => up(e))
    $('.down').on('click', (e) => down(e))
    if (!isAllZero()) {
      $('#startBtn').removeClass('disabled')
      $('#startBtn').on('click', function () {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'start' })
      })
    } else {
      $('#startBtn').addClass('disabled')
    }
    $('#resetBtn').removeClass('disabled')
    $('#resetBtn').on('click', function () {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'reset' })
    })
    insertCheck()
  }
}

// プログラムがすべて 0 か
function isAllZero () {
  const programs = $('.program li')
  for (let i = 0, max = programs.length; i < max; i++) {
    if (programs[i].innerText !== '00:00:00') {
      return false
    }
  }
  return true
}

// プログラムタイマー追加
function insertProgram () {
  const hour = $('#hour')
  const minute = $('#minute')
  const second = $('#second')

  const time = setTime(hour.val(), minute.val(), second.val())
  const token = Math.random().toString(36).slice(-8)

  let param = {
    type: 'insert',
    time: {
      hour: time.hour,
      minute: time.minute,
      second: time.second
    },
    defaultTime: {
      hour: time.hour,
      minute: time.minute,
      second: time.second
    },
    token: token
  }

  chrome.runtime.sendMessage(EXTENSION_ID, param)

  // 初期化
  hour.val('')
  minute.val('')
  second.val('')
  minute.focus()

  insertCheck()
}

function up (e) {
  const parent = $(e.currentTarget).parent()
  const input = parent.find('input')
  let value = input.val()
  value++
  input.val(value)
  insertCheck()
}

function down (e) {
  const parent = $(e.currentTarget).parent()
  const input = parent.find('input')
  let value = input.val()
  if (value > 0) {
    value--
  }
  input.val(value)
  insertCheck()
}

// 0埋め処理
function zeroPadding (num) {
  return ('0' + num).slice(-2)
}

// 時間を作る
function setTime (hour, minute, second) {
  hour = parseInt(hour)
  minute = parseInt(minute)
  second = parseInt(second)

  if (!second) {
    second = 0
  }
  if (!minute) {
    minute = 0
  }
  if (!hour) {
    hour = 0
  }
  if (second >= 60) {
    minute += parseInt(second / 60)
    second = second % 60
  }
  if (minute >= 60) {
    hour += parseInt(minute / 60)
    minute = minute % 60
  }

  return {
    hour: hour,
    minute: minute,
    second: second
  }
}

// 追加ボタン
function insertCheck () {
  const hour = $('#hour').val() ? parseInt($('#hour').val()) : 0
  const minute = $('#minute').val() ? parseInt($('#minute').val()) : 0
  const second = $('#second').val() ? parseInt($('#second').val()) : 0

  $('#setBtn').off('click')
  if (hour === 0 && minute === 0 && second === 0) {
    $('#setBtn').removeClass('filled')
  } else {
    $('#setBtn').addClass('filled')
    $('#setBtn').on('click', insertProgram)
  }
}

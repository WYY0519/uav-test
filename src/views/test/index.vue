<template>
  <div class="container">
    <h1>🎥 WebRTC 视频流畅性测试工具</h1>
    <div style="
        background: #2a2a1a;
        border: 1px solid #665500;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
        font-size: 13px;
        color: #ccaa00;
      ">
      <strong>⚠ 使用前提：</strong><br />
      1. 此页面必须通过 <strong>HTTPS</strong> 或 <strong>localhost</strong> 访问（WebRTC 强制要求安全上下文）<br />
      2. 确保 ZLMediaKit 服务器已配置 WebRTC 并开启了相关端口（HTTP/WebRTC）<br />
      3. 确保 RTSP 流已成功推送到 ZLM，且 stream key 正确<br />
      4. 查看下方日志面板排查具体错误
    </div>

    <div class="player-wrapper">
      <video ref="videoEl" autoplay muted playsinline controls></video>
    </div>

    <div class="config-panel">
      <h2>⚙️ 连接配置</h2>
      <div class="form-row">
        <label>ZLMediaKit 地址:</label>
        <input v-model="form.host" type="text" placeholder="IP 或域名" />
      </div>
      <div class="form-row">
        <label>HTTP 端口:</label>
        <input v-model="form.port" type="number" placeholder="80" />
      </div>
      <div class="form-row">
        <label>App:</label>
        <input v-model="form.app" type="text" placeholder="live" />
      </div>
      <div class="form-row">
        <label>Stream:</label>
        <input v-model="form.stream" type="text" placeholder="stream_key" />
      </div>
      <div class="form-row">
        <label>使用 HTTPS:</label>
        <input v-model="form.useHttps" type="checkbox" style="flex: none; min-width: auto; width: 18px; height: 18px" />
      </div>

      <div class="btn-group">
        <button class="btn-play" :disabled="isPlaying" @click="startPlay">
          ▶ 开始播放
        </button>
        <button class="btn-stop" :disabled="!isPlaying" @click="stopPlay">
          ⏹ 停止播放
        </button>
        <button class="btn-snapshot" :disabled="!isPlaying" @click="takeSnapshot">
          📷 截图
        </button>
      </div>

      <div class="status-bar">
        <div class="status-dot" :class="statusClass"></div>
        <span>{{ statusText }}</span>
        <span style="color: #555; margin-left: auto">{{ elapsedTime }}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.resolution }}</div>
          <div class="stat-label">分辨率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.fps }}</div>
          <div class="stat-label">帧率 (FPS)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.bitrate }}</div>
          <div class="stat-label">码率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.packetLoss }}</div>
          <div class="stat-label">丢包率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.jitter }}</div>
          <div class="stat-label">抖动 (ms)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.delay }}</div>
          <div class="stat-label">估算延迟 (ms)</div>
        </div>
      </div>
    </div>

    <div class="log-panel">
      <h2>📋 日志</h2>
      <div ref="logContainer">
        <div v-for="(item, idx) in logs" :key="idx" class="log-entry">
          <span class="log-time">{{ item.time }}</span>
          <span :class="`log-${item.level}`">{{ item.msg }}</span>
        </div>
      </div>
    </div>

    <div class="snapshot-preview" :class="{ show: showSnapshot }">
      <h2 style="font-size: 14px; color: #aaa; margin-bottom: 8px">📸 截图预览</h2>
      <img ref="snapshotImg" alt="snapshot" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, onMounted } from 'vue'

// DOM 引用
const videoEl = ref(null)
const logContainer = ref(null)
const snapshotImg = ref(null)

// 表单
const form = reactive({
  host: '121.41.60.99',
  port: '80',
  app: 'live',
  stream: 'stream_key',
  useHttps: false
})

// 状态
const isPlaying = ref(false)
const statusText = ref('未连接')
const statusClass = ref('')
const elapsedTime = ref('')
const showSnapshot = ref(false)
const logs = ref([])

// 统计数据
const stats = reactive({
  resolution: '--',
  fps: '--',
  bitrate: '--',
  packetLoss: '--',
  jitter: '--',
  delay: '--'
})

// 全局实例
let pc = null
let playStartTime = null
let statsTimer = null
let elapsedTimer = null
let currentStream = null

// 日志
function log(msg, level = 'info') {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.unshift({ time, msg, level })
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 状态设置
function setStatus(status, dotClass) {
  statusText.value = status
  statusClass.value = dotClass || ''
  log(
    status,
    dotClass === 'error' ? 'error' : dotClass === 'connecting' ? 'warn' : 'success'
  )
}

// 请求 SDP
async function fetchSDP(offerSdp) {
  const { host, port, app, stream, useHttps } = form
  if (!host || !app || !stream) throw new Error('请填写完整连接信息')

  const protocol = useHttps ? 'https' : 'http'
  currentStream = { host, port, app, stream, protocol }
  const apiUrl = `${protocol}://${host}:${port}/index/api/webrtc?app=${app}&stream=${stream}&type=play`

  log(`请求信令: ${apiUrl}`)
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: offerSdp
  })

  if (!res.ok) throw new Error(`请求失败 ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`信令错误：${data.msg}`)

  const sdp = data.sdp || (data.data && data.data.sdp)
  if (!sdp) throw new Error('无 SDP 返回，流可能不存在')
  return { sdp }
}

// 等待 ICE 完成
function waitForIceGatheringComplete(pc) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
    setTimeout(() => resolve(), 5000)
  })
}

// 开始播放
async function startPlay() {
  if (pc) stopPlay()
  isPlaying.value = true
  setStatus('连接中...', 'connecting')
  playStartTime = Date.now()

  try {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
    pc = new RTCPeerConnection(config)

    pc.onicecandidate = e => {
      if (e.candidate) {
        log(`ICE 候选：${e.candidate.type} ${e.candidate.protocol}`)
      } else {
        log('ICE 候选收集完成')
      }
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      log(`ICE 状态：${state}`)
      if (state === 'connected' || state === 'completed') {
        setStatus('播放中', 'connected')
        startStatsMonitor()
        startElapsedTimer()
      } else if (state === 'failed' || state === 'disconnected') {
        setStatus('连接断开', 'error')
        stopPlay()
      }
    }

    pc.ontrack = e => {
      if (e.track.kind === 'video') {
        videoEl.value.srcObject = e.streams[0]
        log('已接收视频流', 'success')
      }
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })
    await pc.setLocalDescription(offer)
    await waitForIceGatheringComplete(pc)

    const { sdp } = await fetchSDP(pc.localDescription.sdp)
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
    log('连接成功', 'success')
  } catch (err) {
    log(`失败：${err.message}`, 'error')
    setStatus('播放失败', 'error')
    stopPlay()
  }
}

// 停止播放
function stopPlay() {
  isPlaying.value = false
  if (statsTimer) clearInterval(statsTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
  if (pc) { pc.close(); pc = null }
  if (videoEl.value?.srcObject) {
    videoEl.value.srcObject.getTracks().forEach(t => t.stop())
    videoEl.value.srcObject = null
  }
  setStatus('已停止')
  elapsedTime.value = ''
  resetStats()
  log('播放已停止')
}

// 重置统计
function resetStats() {
  Object.assign(stats, {
    resolution: '--',
    fps: '--',
    bitrate: '--',
    packetLoss: '--',
    jitter: '--',
    delay: '--'
  })
}

// 更新统计
async function updateStats() {
  if (!pc) return
  try {
    const s = await pc.getStats()
    let inbound = null
    let remote = null
    s.forEach(r => {
      if (r.type === 'inbound-rtp' && r.kind === 'video') inbound = r
      if (r.type === 'remote-inbound-rtp' && r.kind === 'video') remote = r
    })

    if (inbound) {
      stats.resolution = inbound.frameWidth ? `${inbound.frameWidth}x${inbound.frameHeight}` : '--'
      stats.fps = inbound.framesPerSecond?.toFixed(0) || '--'
      stats.bitrate = inbound.bitrateMean ? `${(inbound.bitrateMean / 1000).toFixed(0)} kbps` : '--'
      stats.packetLoss = inbound.packetsLost != null
        ? `${((inbound.packetsLost / (inbound.packetsLost + inbound.packetsReceived || 1)) * 100).toFixed(2)}%`
        : '--'
      stats.jitter = inbound.jitter ? `${(inbound.jitter * 1000).toFixed(1)} ms` : '--'
    }
    if (remote) {
      stats.delay = remote.roundTripTime ? `${(remote.roundTripTime * 500).toFixed(0)} ms` : '--'
    }
  } catch { }
}

function startStatsMonitor() {
  statsTimer = setInterval(updateStats, 1000)
}

// 播放时长
function startElapsedTimer() {
  elapsedTimer = setInterval(() => {
    if (!playStartTime) return
    const sec = Math.floor((Date.now() - playStartTime) / 1000)
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    elapsedTime.value = `播放时长: ${h}:${m}:${s}`
  }, 500)
}

// 截图
function takeSnapshot() {
  const v = videoEl.value
  if (!v?.videoWidth) return
  const canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/png')
  snapshotImg.value.src = url
  showSnapshot.value = true

  const a = document.createElement('a')
  a.download = `webrtc-${Date.now()}.png`
  a.href = url
  a.click()
  log('截图已保存', 'success')
}

onMounted(() => {
  log('WebRTC 测试工具已就绪', 'success')
})

onUnmounted(() => {
  stopPlay()
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f0f0f;
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  width: 100%;
  max-width: 960px;
  padding: 24px;
}

h1 {
  text-align: center;
  font-size: 22px;
  margin-bottom: 20px;
  color: #fff;
}

.player-wrapper {
  position: relative;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

video {
  width: 100%;
  display: block;
  background: #000;
  min-height: 400px;
}

.config-panel {
  margin-top: 20px;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
}

.config-panel h2 {
  font-size: 16px;
  margin-bottom: 14px;
  color: #aaa;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.form-row label {
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.form-row input {
  flex: 1;
  min-width: 180px;
  padding: 10px 14px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #0f0f0f;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-row input:focus {
  border-color: #4a9eff;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

button {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-play {
  background: #4a9eff;
  color: #fff;
}

.btn-play:hover:not(:disabled) {
  background: #3a8eef;
}

.btn-stop {
  background: #e05555;
  color: #fff;
}

.btn-stop:hover:not(:disabled) {
  background: #d04545;
}

.btn-snapshot {
  background: #555;
  color: #fff;
}

.btn-snapshot:hover:not(:disabled) {
  background: #666;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 13px;
  flex-wrap: wrap;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
}

.status-dot.connected {
  background: #4caf50;
}

.status-dot.connecting {
  background: #ff9800;
  animation: pulse 1s infinite;
}

.status-dot.error {
  background: #f44336;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.stat-card {
  background: #0f0f0f;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #4a9eff;
}

.stat-label {
  font-size: 11px;
  color: #777;
  margin-top: 2px;
}

.log-panel {
  margin-top: 20px;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.log-panel h2 {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
}

.log-entry {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 0;
  border-bottom: 1px solid #222;
}

.log-time {
  color: #666;
  margin-right: 8px;
}

.log-info {
  color: #4a9eff;
}

.log-warn {
  color: #ff9800;
}

.log-error {
  color: #f44336;
}

.log-success {
  color: #4caf50;
}

.snapshot-preview {
  margin-top: 16px;
  display: none;
}

.snapshot-preview.show {
  display: block;
}

.snapshot-preview img {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid #333;
}
</style>
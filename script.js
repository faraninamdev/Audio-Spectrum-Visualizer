class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.isPlaying = false;
        this.animationId = null;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupAudioContext();
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }
    
    setupEventListeners() {
        const audioFile = document.getElementById('audioFile');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const progressBar = document.getElementById('progressBar');
        
        audioFile.addEventListener('change', (e) => this.loadAudio(e));
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        stopBtn.addEventListener('click', () => this.stop());
        volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        progressBar.addEventListener('click', (e) => this.seek(e));
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.onTrackEnded());
    }
    
    async loadAudio(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const url = URL.createObjectURL(file);
            this.audio.src = url;
            
            // Update UI
            document.getElementById('trackName').textContent = file.name;
            document.getElementById('trackInfo').style.display = 'block';
            document.getElementById('playPauseBtn').disabled = false;
            document.getElementById('stopBtn').disabled = false;
            
            // Setup audio source for visualization
            if (this.source) {
                this.source.disconnect();
            }
            
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }
    
    async togglePlayPause() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            document.getElementById('playPauseBtn').textContent = 'Play';
            cancelAnimationFrame(this.animationId);
        } else {
            this.audio.play();
            this.isPlaying = true;
            document.getElementById('playPauseBtn').textContent = 'Pause';
            this.animate();
        }
    }
    
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = 'Play';
        cancelAnimationFrame(this.animationId);
        this.clearCanvas();
    }
    
    setVolume(value) {
        this.audio.volume = value / 100;
    }
    
    seek(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        this.audio.currentTime = percentage * this.audio.duration;
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            document.getElementById('progressFill').style.width = percentage + '%';
            
            const currentTime = this.formatTime(this.audio.currentTime);
            const duration = this.formatTime(this.audio.duration);
            document.getElementById('trackTime').textContent = `${currentTime} / ${duration}`;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    onTrackEnded() {
        this.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = 'Play';
        cancelAnimationFrame(this.animationId);
        this.clearCanvas();
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, width, height);
        
        const barWidth = width / this.bufferLength * 2;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
            const hue = (i / this.bufferLength) * 360;
            gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 70%)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            
            // Add glow effect
            this.ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            this.ctx.shadowBlur = 0;
            
            x += barWidth;
        }
    }
    
    clearCanvas() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.fillRect(0, 0, width, height);
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
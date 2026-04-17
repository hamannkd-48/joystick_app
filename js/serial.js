// ============================================================
// WEB SERIAL API - Communication with Arduino
// ============================================================

export class SerialManager {
  constructor(onData, onConnect, onDisconnect) {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.onData = onData;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this._readLoop = null;
    this._lineBuffer = '';
  }

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported. Use Chrome or Edge.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.writer = this.port.writable.getWriter();
      this.connected = true;
      this.onConnect();

      this._startReading();
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        throw err;
      }
    }
  }

  async disconnect() {
    this.connected = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (e) {
      // Port may already be closed
    }
    this.onDisconnect();
  }

  async send(data) {
    if (!this.connected || !this.writer) return;
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(data + '\n'));
  }

  async _startReading() {
    const decoder = new TextDecoder();

    while (this.port && this.port.readable && this.connected) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          const text = decoder.decode(value);
          this._lineBuffer += text;

          // Process complete lines
          const lines = this._lineBuffer.split('\n');
          this._lineBuffer = lines.pop(); // keep incomplete last line

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) this.onData(trimmed);
          }
        }
      } catch (e) {
        if (this.connected) {
          console.error('Serial read error:', e);
        }
      } finally {
        this.reader.releaseLock();
        this.reader = null;
      }
    }

    if (this.connected) {
      this.connected = false;
      this.onDisconnect();
    }
  }
}

const Bridge = (() => {
  function native(pluginName) {
    return typeof window !== 'undefined' && !!window[pluginName];
  }

  const Haptics = {
    tick() {
      if (native('CapacitorHaptics')) {
        window.CapacitorHaptics.impact({ style: 'LIGHT' });
      } else if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    },
    success() {
      if (native('CapacitorHaptics')) {
        window.CapacitorHaptics.notification({ type: 'SUCCESS' });
      } else if (navigator.vibrate) {
        navigator.vibrate([6, 50, 12]);
      }
    },
    warning() {
      if (native('CapacitorHaptics')) {
        window.CapacitorHaptics.notification({ type: 'WARNING' });
      } else if (navigator.vibrate) {
        navigator.vibrate([12, 30, 12, 30, 18]);
      }
    },
    error() {
      if (native('CapacitorHaptics')) {
        window.CapacitorHaptics.notification({ type: 'ERROR' });
      } else if (navigator.vibrate) {
        navigator.vibrate([20, 40, 20, 40, 30]);
      }
    },
  };

  const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
  const HEART_RATE_CHAR = '00002a37-0000-1000-8000-00805f9b34fb';

  let _bleDevice = null;
  let _bleCallbacks = [];
  let _bleSimInterval = null;

  const Bluetooth = {
    isAvailable() {
      return native('BleClient') || !!navigator.bluetooth;
    },
    isConnected() {
      return _bleDevice !== null;
    },
    getDevice() {
      return _bleDevice;
    },
    async requestDevice() {
      if (native('BleClient')) {
        await window.BleClient.initialize();
        _bleDevice = await window.BleClient.requestDevice({
          services: [HEART_RATE_SERVICE],
        });
        return { id: _bleDevice.deviceId, name: _bleDevice.name, simulated: false };
      }
      if (navigator.bluetooth) {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [HEART_RATE_SERVICE] }],
        });
        _bleDevice = { deviceId: device.id, name: device.name, simulated: false };
        return { id: device.id, name: device.name, simulated: false };
      }
      _bleDevice = { simulated: true };
      return { id: 'SIM-001', name: 'Simulated HR Monitor', simulated: true };
    },
    async subscribeHeartRate(callback) {
      if (!_bleDevice) throw new Error('No device connected');
      _bleCallbacks.push(callback);
      if (_bleDevice.simulated) {
        let bpm = 68;
        _bleSimInterval = setInterval(() => {
          bpm = Math.max(55, Math.min(120, bpm + Math.round((Math.random() - 0.48) * 4)));
          _bleCallbacks.forEach(cb => cb(bpm));
        }, 2000);
        return;
      }
      if (native('BleClient')) {
        await window.BleClient.connect(_bleDevice.deviceId);
        await window.BleClient.startNotifications(
          _bleDevice.deviceId, HEART_RATE_SERVICE, HEART_RATE_CHAR,
          (value) => {
            const flags = value.getUint8(0);
            const bpm = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
            _bleCallbacks.forEach(cb => cb(bpm));
          }
        );
      } else if (navigative.bluetooth) {
        const server = await _bleDevice.gatt.connect();
        const service = await server.getPrimaryService(HEART_RATE_SERVICE);
        const char = await service.getCharacteristic(HEART_RATE_CHAR);
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (event) => {
          const value = event.target.value;
          const flags = value.getUint8(0);
          const bpm = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
          _bleCallbacks.forEach(cb => cb(bpm));
        });
      }
    },
    async disconnect() {
      _bleCallbacks = [];
      if (_bleSimInterval) {
        clearInterval(_bleSimInterval);
        _bleSimInterval = null;
      }
      if (_bleDevice && !_bleDevice.simulated) {
        if (native('BleClient')) {
          await window.BleClient.disconnect(_bleDevice.deviceId);
        } else if (_bleDevice.gatt) {
          try { _bleDevice.gatt.disconnect(); } catch {}
        }
      }
      _bleDevice = null;
    },
  };

  let _globeContainer = null;

  const Globe = {
    show(containerId, dataPoints) {
      _globeContainer = containerId;
      const el = document.getElementById(containerId);
      if (!el) return;
      if (native('CapacitorGlobe')) {
        window.CapacitorGlobe.show({ containerId, data: dataPoints });
        return;
      }
      const pts = (dataPoints || []).slice(0, 14);
      const maxVal = Math.max(...pts.map(p => p.score || p.value || 1), 1);
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--ts);gap:8px;text-align:center;padding:12px">
          <svg viewBox="0 0 120 120" width="90" height="90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width=".5" opacity=".2"/>
            <circle cx="60" cy="60" r="38" fill="none" stroke="var(--accent)" stroke-width=".5" opacity=".3"/>
            <circle cx="60" cy="60" r="24" fill="none" stroke="var(--accent)" stroke-width=".5" opacity=".4"/>
            <circle cx="60" cy="60" r="10" fill="var(--accent)" opacity=".5"/>
            ${pts.map((p, i) => {
              const angle = (i / pts.length) * Math.PI * 2;
              const r = 12 + (p.score || p.value || 0) / maxVal * 40;
              const x = 60 + Math.cos(angle) * r;
              const y = 60 + Math.sin(angle) * r;
              const size = 1.5 + ((p.score || p.value || 0) / maxVal) * 3;
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="var(--accent)" opacity="${(0.3 + i * 0.05).toFixed(2)}"/>`;
            }).join('')}
          </svg>
          <span style="font-size:11px;line-height:1.6;color:var(--tm)">
            3D Life Atlas<br>
            <em style="font-size:10px;opacity:.55">Requires @neura-lumina/capacitor-globe</em>
          </span>
        </div>`;
    },
    update(dataPoints) {
      if (native('CapacitorGlobe')) {
        window.CapacitorGlobe.update({ data: dataPoints });
      } else {
        this.show(_globeContainer, dataPoints);
      }
    },
    hide(containerId) {
      if (native('CapacitorGlobe')) {
        window.CapacitorGlobe.hide();
      }
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = '';
      _globeContainer = null;
    },
  };

  const Camera = {
    async capturePhoto(options = {}) {
      if (native('Camera')) {
        const result = await window.Camera.getPhoto({
          quality: options.quality || 80, allowEditing: false,
          resultType: 'base64', source: options.source || 'PROMPT',
        });
        return 'data:image/jpeg;base64,' + result.base64String;
      }
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = r => resolve(r.result);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },
  };

  const Notifications = {
    async schedule({ title, body, atDate, id }) {
      if (native('LocalNotifications')) {
        await window.LocalNotifications.schedule({
          notifications: [{ title, body, id: id || Date.now(), schedule: { at: atDate } }],
        });
        return;
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        const delay = Math.max(0, atDate.getTime() - Date.now());
        setTimeout(() => new Notification(title, { body }), delay);
      }
    },
    async requestPermission() {
      if (native('LocalNotifications')) {
        return window.LocalNotifications.requestPermissions();
      }
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return 'denied';
    },
    async cancel(id) {
      if (native('LocalNotifications')) {
        await window.LocalNotifications.cancel({ notifications: [{ id }] });
      }
    },
    async cancelAll() {
      if (native('LocalNotifications')) {
        await window.LocalNotifications.cancelAll();
      }
    },
    async getPending() {
      if (native('LocalNotifications')) {
        const result = await window.LocalNotifications.getPending();
        return result.notifications || [];
      }
      return [];
    },
  };

  const Share = {
    async shareText(text, title = 'myTrack') {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    },
    async shareFile(blob, filename) {
      if (navigator.share && navigator.canShare({ files: [new File([blob], filename)] })) {
        await navigator.share({ files: [new File([blob], filename)], title: 'myTrack' });
      }
    },
  };

  const Clipboard = {
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      }
    },
    async paste() {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    },
  };

  const Screen = {
    async keepAwake(shouldKeep = true) {
      if (native('CapacitorKeepAwake')) {
        if (shouldKeep) await window.CapacitorKeepAwake.keepAwake();
        else await window.CapacitorKeepAwake.allowSleep();
      } else if ('wakeLock' in navigator) {
        try {
          if (shouldKeep) {
            _wakeLock = await navigator.wakeLock.request('screen');
          } else if (_wakeLock) {
            await _wakeLock.release();
            _wakeLock = null;
          }
        } catch {}
      }
    },
  };
  let _wakeLock = null;

  const Network = {
    async isOnline() {
      return navigator.onLine;
    },
    getType() {
      if (native('CapacitorNetwork')) {
        return window.CapacitorNetwork.getStatus();
      }
      return navigator.onLine ? 'wifi' : 'none';
    },
  };

  const Biometrics = {
    async isAvailable() {
      return native('CapacitorBiometrics') || false;
    },
    async verify(reason = 'Verify identity') {
      if (native('CapacitorBiometrics')) {
        try {
          await window.CapacitorBiometrics.verify({ reason });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },
  };

  return {
    Haptics, Bluetooth, Globe, Camera, Notifications,
    Share, Clipboard, Screen, Network, Biometrics,
    native,
  };
})();

export default Bridge;

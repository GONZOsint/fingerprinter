const ghostDeviceInfo = {};

// Core utilities
const utils = {
    isFeatureSupported: (feature) => {
        return (typeof window !== 'undefined' && feature in window) || (typeof navigator !== 'undefined' && feature in navigator);
    },
    safeExecute: async (fn, defaultValue = 'N/A') => {
        try {
            return await fn();
        } catch (error) {
            console.error(`Error executing function:`, error);
            return defaultValue;
        }
    },
    getNavigatorInfo: (property) => {
        try {
            return typeof navigator !== 'undefined' ? navigator[property] || 'N/A' : 'N/A';
        } catch {
            return 'N/A';
        }
    },
    detectVirtualEnvironment: () => {
        if (typeof window === 'undefined' || typeof window.screen === 'undefined') return false;
        const screen = window.screen;
        const clues = [
            screen.width === screen.availWidth,
            screen.height === screen.availHeight,
            typeof window.outerWidth !== 'undefined' && window.outerWidth === window.innerWidth,
            typeof window.outerHeight !== 'undefined' && window.outerHeight === window.innerHeight
        ];
        return clues.every(clue => clue);
    },
     measurePerformance: async (fn, iterations = 100) => {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
             await fn();
        }
        return (performance.now() - start) / iterations;
    }
};

// CPU/Processor Information Collector
const processorCollector = {
    getCPUInfo: async () => {
        const hardwareConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 'N/A' : 'N/A';
        const getArchitecture = () => {
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
            if (ua.includes('arm64') || ua.includes('aarch64')) return 'ARM64';
            if (ua.includes('arm')) return 'ARM';
            if (ua.includes('x86_64') || ua.includes('amd64') || ua.includes('x64')) return 'x86_64';
            if (ua.includes('x86') || ua.includes('i686')) return 'x86';
            return 'unknown';
        };
       const performanceScore = await utils.measurePerformance(async () => {
            let result = 0;
             for (let i = 0; i < 1000000; i++) {
                 result += Math.sqrt(i);
            }
            return result;
        });
        const userAgentData = await utils.safeExecute(async () => {
             if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
                const data = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture', 'bitness', 'uaFullVersion']);
                return data;
            }
            return 'N/A';
        }, 'N/A');

        return {
            logicalCores: hardwareConcurrency,
            architecture: getArchitecture(),
             performanceMetrics: { score: performanceScore, unit: 'ms/iteration' },
            capabilities: {
                simd: typeof window !== 'undefined' && 'Uint8Array' in window && 'from' in Uint8Array,
               threads: typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined', // SharedArrayBuffer requires cross-origin isolation
                atomics: typeof window !== 'undefined' && 'Atomics' in window
           },
           userAgentData: userAgentData // More detailed info from User-Agent Client Hints API
       };
    }
};

// Memory Information Collector
const memoryCollector = {
    getMemoryInfo: async () => {
        const memory = {
            deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory || 'N/A' : 'N/A',
            heap: typeof performance !== 'undefined' && 'memory' in performance ? {
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize
            } : 'N/A',
            pressureLevel: typeof performance !== 'undefined' && 'memory' in performance && 'pressureLevel' in performance.memory ? performance.memory.pressureLevel : 'N/A',
            sharedMemorySupport: await utils.safeExecute(() => typeof window !== 'undefined' && new SharedArrayBuffer(1024) && true, false),
           performance: await memoryCollector.measureMemoryPerformance()
        };
        return memory;
    },
     measureMemoryPerformance: async () => {
       const testSize = 1024 * 1024; // 1MB
       const iterations = 3;
       const results = {read: [], write: []};

       for (let i = 0; i < iterations; i++) {
        // Write test
           const writeStart = performance.now();
           new Uint8Array(testSize);
           const writeEnd = performance.now();
           results.write.push(writeEnd-writeStart);

           // Read test
            const data = new Uint8Array(testSize);
            const readStart = performance.now();
             data.forEach(()=> {});
            const readEnd = performance.now();
           results.read.push(readEnd - readStart);
       }
         return {
            readAvg: results.read.reduce((a, b) => a + b, 0) / iterations,
            writeAvg: results.write.reduce((a, b) => a + b, 0) / iterations
        }
    },
    // Removed monitorMemoryPressure as it requires user interaction
};

// Storage Information Collector
const storageCollector = {
    getStorageInfo: async () => {
       const storage = {
            quota: 'N/A', // Removed detailed quota information to avoid prompts
            persistent: 'N/A', // Removed persistent storage check to avoid prompts
            performance: 'N/A', // Removed storage performance measurements to avoid potential issues
            deviceType: await storageCollector.getStorageDeviceType() // Keep this for now, but be aware it might have implications
        };
        return storage;
    },
    // Removed measureStoragePerformance to avoid potential storage interaction
    getStorageDeviceType: async () => {
        return await utils.safeExecute(async () => {
            const samples = 5;
             const sampleSize = 1024 * 1024; // 1MB
             const timings = [];
            for (let i = 0; i < samples; i++) {
               const startTime = performance.now();
               new Blob([new Uint8Array(sampleSize)]); // Simulate write
                const endTime = performance.now();
                timings.push(endTime - startTime);
           }
             const avgTime = timings.reduce((a, b) => a + b) / samples;
           const variance = timings.reduce((a, b) => a + Math.pow(b - avgTime, 2), 0) / samples;
           return {
                likely: variance < 1 ? 'SSD' : 'HDD',
                confidence: 'low',
                metrics: { averageWriteTime: avgTime, variance: variance, sampleSize: samples }
           };
        }, 'N/A');
    }
};

// Graphics/GPU Information Collector
const graphicsCollector = {
    getGPUInfo: async () => {
        return await utils.safeExecute(() => {
            if (typeof document === 'undefined') return 'N/A';
            const canvas = document.createElement('canvas');
            const gl2 = canvas.getContext('webgl2');
            const gl = gl2 || canvas.getContext('webgl');
            if (!gl) return 'N/A';
             // const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); // Deprecated in Firefox
             const vendor =  gl.getParameter(gl.VENDOR);
             const renderer = gl.getParameter(gl.RENDERER);
            const gpuInfo = {
                vendor: vendor,
               renderer: renderer,
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                 capabilities: {
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxCubemapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                     maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                     maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
                    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
                    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)
                },
                extensions: gl.getSupportedExtensions(),
                 performance: graphicsCollector.measureGPUPerformance(gl),
                hardwareAcceleration: {
                    canvas2D: typeof document !== 'undefined' && Boolean(document.createElement('canvas').getContext('2d')),
                    webGL: Boolean(gl)
                },
                 contextAttributes: gl.getContextAttributes()
            };
            return gpuInfo;
        }, 'N/A');
    },
     measureGPUPerformance: async (gl) => {
        return await utils.safeExecute(() => {
            const startTime = performance.now();
            const iterations = 100;
            for (let i = 0; i < iterations; i++) {
                 gl.clear(gl.COLOR_BUFFER_BIT);
               gl.flush();
            }
           const endTime = performance.now();
           return { renderTime: (endTime - startTime) / iterations, unit: 'ms/frame' };
        }, 'N/A');
    }
};

// Display Information Collector
const displayCollector = {
    getDisplayInfo: () => {
        if (typeof window === 'undefined' || typeof window.screen === 'undefined') return {};
        const display = {
           screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
               colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
               orientation: typeof screen.orientation !== 'undefined' ? { type: screen.orientation.type, angle: screen.orientation.angle } : 'N/A',
                 deviceXDPI: screen.deviceXDPI || 'N/A',
                deviceYDPI: screen.deviceYDPI || 'N/A'
           },
           dpi: typeof window.devicePixelRatio !== 'undefined' ? window.devicePixelRatio : 'N/A',
            resolution: {
                physical: { width: screen.width * (typeof window.devicePixelRatio !== 'undefined' ? window.devicePixelRatio : 1), height: screen.height * (typeof window.devicePixelRatio !== 'undefined' ? window.devicePixelRatio : 1) },
                 logical: { width: screen.width, height: screen.height }
            },
           colorGamut: displayCollector.getColorGamut(),
           hdrSupport: displayCollector.checkHDRSupport(),
           refreshRate: typeof window.screen.refreshRate !== 'undefined' ? screen.refreshRate : 'N/A',
             multipleDisplays: typeof window !== 'undefined' && 'getScreens' in window,
            screenDetails: typeof window !== 'undefined' && 'getScreenDetails' in window ? 'Supported' : 'N/A'
       };
         return display;
    },
    getColorGamut: () => {
       if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'N/A';
        const gamuts = ['rec2020', 'p3', 'srgb'];
       for (const gamut of gamuts) {
            if (window.matchMedia(`(color-gamut: ${gamut})`).matches) {
                return gamut;
           }
        }
       return 'N/A';
   },
   checkHDRSupport: () => {
      if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'N/A';
       return {
           hdrSupported: window.matchMedia('(dynamic-range: high)').matches,
            colorDepth: typeof window.screen !== 'undefined' ? screen.colorDepth : 'N/A'
        };
    }
};

// Camera Information Collector
const cameraCollector = {
   getCameraInfo: async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return 'N/A';
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
           return { count: cameras.length };
       } catch (e) {
           return 'N/A';
        }
    }
};

// Audio Hardware Information Collector
const audioCollector = {
    getAudioInfo: async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return 'N/A';
       try {
           const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInfo = {
                inputs: devices.filter(device => device.kind === 'audioinput').map(device => ({
                   deviceId: device.deviceId,
                   label: device.label || 'Unnamed Input',
                   groupId: device.groupId
                })),
                 outputs: devices.filter(device => device.kind === 'audiooutput').map(device => ({
                   deviceId: device.deviceId,
                   label: device.label || 'Unnamed Output',
                   groupId: device.groupId
               })),
               capabilities: await utils.safeExecute(async () => {
                    const audioContext = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
                    if (!audioContext) return 'N/A';
                   const cap = {
                        sampleRate: audioContext.sampleRate,
                        maxChannelCount: audioContext.destination.maxChannelCount,
                        state: audioContext.state,
                        baseLatency: audioContext.baseLatency || 'N/A',
                       outputLatency: audioContext.outputLatency || 'N/A'
                    };
                    audioContext.close();
                    return cap;
                }, 'N/A'),
                features: await utils.safeExecute(async () => (typeof navigator !== 'undefined' ? {
                    echoCancellation: (await navigator.mediaDevices.getSupportedConstraints()).echoCancellation,
                    noiseSuppression: (await navigator.mediaDevices.getSupportedConstraints()).noiseSuppression,
                    autoGainControl: (await navigator.mediaDevices.getSupportedConstraints()).autoGainControl,
                    midi: 'requestMIDIAccess' in navigator,
                    spatialAudio: 'PannerNode' in window
                } : {}), {})
           };
            return audioInfo;
        } catch (e) {
           return 'N/A';
        }
   }
};

// Network Hardware Information Collector
const networkCollector = {
    getNetworkInfo: async () => {
         const connection = typeof navigator !== 'undefined' ? navigator.connection || navigator.mozConnection || navigator.webkitConnection : undefined;
       const networkInfo = {
            connection: connection ? {
               type: connection.type,
               effectiveType: connection.effectiveType,
                downlink: connection.downlink,
               downlinkMax: connection.downlinkMax,
                rtt: connection.rtt,
               saveData: connection.saveData
            } : 'N/A',
           onLine: typeof navigator !== 'undefined' ? navigator.onLine : false,
           performanceMetrics: await networkCollector.measureNetworkPerformance(),
           localIPs: await networkCollector.getLocalIPs()
        };
        return networkInfo;
    },
   measureNetworkPerformance: async () => {
        return await utils.safeExecute(async () => {
           const startTime = performance.now();
            await fetch('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==');
            const endTime = performance.now();
            return { latency: endTime - startTime, type: 'basic-fetch-test' };
        }, 'N/A');
    },
   getLocalIPs: async () => {
        return await utils.safeExecute(async () => {
           const rtcPeerConnection = typeof RTCPeerConnection !== 'undefined' ? new RTCPeerConnection({ iceServers: [] }) : null;
           if (!rtcPeerConnection) return 'N/A';
           rtcPeerConnection.createDataChannel('');
           const ipAddresses = new Set();
          rtcPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(event.candidate.candidate);
                    if (ipMatch) {
                        ipAddresses.add(ipMatch[1]);
                    }
                }
            };
            await rtcPeerConnection.createOffer().then(offer => rtcPeerConnection.setLocalDescription(offer));
           return Array.from(ipAddresses);
       }, 'N/A');
   }
};

// Battery Information Collector
const batteryCollector = {
   getBatteryInfo: async () => {
      if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return 'N/A';
        try {
            const battery = await navigator.getBattery();
            return {
                charging: battery.charging,
                level: battery.level * 100,
                chargingTime: battery.chargingTime === Infinity ? 'N/A' : battery.chargingTime,
               dischargingTime: battery.dischargingTime === Infinity ? 'N/A' : battery.dischargingTime,
               powerSource: battery.charging ? 'AC' : 'Battery',
                temperature: battery.temperature || 'N/A',
                voltage: battery.voltage || 'N/A',
               capacity: battery.capacity || 'N/A',
                health: batteryCollector.estimateBatteryHealth(battery),
               // Removed events monitoring as it requires user interaction
           };
        } catch (e) {
            return 'N/A';
        }
    },
   estimateBatteryHealth: (battery) => {
        return battery.capacity ? (battery.capacity / 1) * 100 : 'N/A';
   },
    // Removed monitorBatteryEvents as it requires user interaction
};

// Input Devices Information Collector
const inputDeviceCollector = {
    getInputDeviceInfo: async () => ({
        pointing: inputDeviceCollector.getPointingDeviceInfo(),
        touch: inputDeviceCollector.getTouchCapabilities(),
       keyboard: inputDeviceCollector.getKeyboardInfo(),
        gamepad: await inputDeviceCollector.getGamepadInfo(),
        virtualReality: inputDeviceCollector.getVRInputInfo(),
        biometric: await inputDeviceCollector.getBiometricInfo(),
       // Removed realtimeCapabilities monitoring as it might involve user interaction
    }),
   getPointingDeviceInfo: () => ({
        precision: typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches ? 'fine' : 'coarse',
        hasPointer: typeof window !== 'undefined' && window.matchMedia('(pointer)').matches,
        primaryInput: typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches ? 'mouse-like' : 'touch-like',
        maxPointers: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0
    }),
   getTouchCapabilities: () => {
        const touchInfo = {
            touchScreen: typeof window !== 'undefined' && 'ontouchstart' in window,
            maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
            coarsePrimary: typeof window !== 'undefined' && window.matchMedia('(any-pointer: coarse)').matches,
            finePrimary: typeof window !== 'undefined' && window.matchMedia('(any-pointer: fine)').matches
        };
       // Removed detailed touch event feature detection as it might involve user interaction
        return touchInfo;
    },
    getKeyboardInfo: () => ({
        present: (typeof navigator !== 'undefined' && 'keyboard' in navigator) || (typeof window !== 'undefined' && window.matchMedia('(any-hover: hover)').matches),
       layout: typeof navigator !== 'undefined' && navigator.keyboard?.getLayoutMap() ? 'Supported' : 'N/A',
       virtualKeyboard: typeof navigator !== 'undefined' && 'virtualKeyboard' in navigator,
        keyboardLock: typeof navigator !== 'undefined' && 'keyboard' in navigator && typeof navigator.keyboard !== 'undefined' && 'lock' in navigator.keyboard
    }),

    getGamepadInfo: async () => {
      if (typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
          return Array.from(navigator.getGamepads()).filter(Boolean).map(gamepad => ({
              id: gamepad.id,
              axes: gamepad.axes.length,
              buttons: gamepad.buttons.length,
              mapping: gamepad.mapping,
              timestamp: gamepad.timestamp,
               buttons: gamepad.buttons.map(button => ({
                   pressed: button.pressed,
                   touched: button.touched,
                  value: button.value
              }))
         }));
      }
       return [];
  },
  getVRInputInfo: () => ({
      vrDisplay: typeof navigator !== 'undefined' && 'getVRDisplays' in navigator,
      xr: typeof navigator !== 'undefined' && 'xr' in navigator,
      features: {
          position: typeof navigator !== 'undefined' && navigator.xr?.isSessionSupported ? navigator.xr.isSessionSupported('immersive-vr') : false,
          orientation: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
      }
  }),
  getBiometricInfo: async () => {
      return await utils.safeExecute(async () => (typeof PublicKeyCredential !== 'undefined' ? {
         platformAuthenticator: await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
          credentials: typeof navigator !== 'undefined' && 'credentials' in navigator
      } : {}), 'N/A');
  },
 // Removed monitorInputCapabilities as it relies on event listeners
};

// Sensors Information Collector
const sensorCollector = {
  getSensorInfo: async () => ({
      motion: await sensorCollector.getMotionSensorInfo(),
      environmental: await sensorCollector.getEnvironmentalSensorInfo(),
     orientation: await sensorCollector.getOrientationSensorInfo(),
     proximity: await sensorCollector.getProximitySensorInfo(),
      light: await sensorCollector.getLightSensorInfo(),
     permissions: await sensorCollector.getSensorPermissions(),
      // Removed realtime sensor data collection
  }),
  getMotionSensorInfo: async () => {
      return new Promise(resolve => {
          if (typeof window === 'undefined' || !window.DeviceMotionEvent) { resolve('N/A'); return; }
          const motionData = { accelerometer: false, gyroscope: false };
          const handler = (event) => {
             motionData.accelerometer = event.accelerationIncludingGravity?.x !== null;
              motionData.gyroscope = event.rotationRate?.alpha !== null;
          };
          window.addEventListener('devicemotion', handler); // Deprecated API, consider migrating to the Sensors API
         setTimeout(() => { window.removeEventListener('devicemotion', handler); resolve(motionData); }, 1000);
      });
  },
  getEnvironmentalSensorInfo: async () => ({
     ambientLight: typeof window !== 'undefined' && 'AmbientLightSensor' in window
  }),
  getOrientationSensorInfo: async () => {
      return new Promise(resolve => {
          if (typeof window === 'undefined' || !window.DeviceOrientationEvent) { resolve('N/A'); return; }
         const orientationData = { absolute: false };
          const handler = (event) => {
              orientationData.absolute = event.absolute;
         };
         window.addEventListener('deviceorientation', handler); // Deprecated API, consider migrating to the Sensors API
          setTimeout(() => { window.removeEventListener('deviceorientation', handler); resolve(orientationData); }, 1000);
     });
  },
  getProximitySensorInfo: async () => ({ supported: typeof window !== 'undefined' && 'ProximitySensor' in window }),
  getLightSensorInfo: async () => ({ supported: typeof window !== 'undefined' && 'AmbientLightSensor' in window }),
  getSensorPermissions: async () => {
     if (typeof navigator === 'undefined' || !navigator.permissions) return 'N/A';
      const permissions = {};
      const sensorTypes = ['accelerometer', 'gyroscope', 'magnetometer', 'ambient-light-sensor'];
       for (const sensor of sensorTypes) {
           permissions[sensor] = 'N/A';
          if(navigator.permissions && navigator.permissions.query){
            permissions[sensor] = await utils.safeExecute(async () => {
                if (navigator.permissions && typeof navigator.permissions.query === 'function') {
                    return await navigator.permissions.query({ name: sensor }).then(result => result.state);
                  }
                  return 'N/A';
              }, 'N/A');
           }
       }
      return permissions;
  },
   // Removed getRealtimeSensorData
};

ghostDeviceInfo.getDeviceInfo = async () => ({
  cpu: await processorCollector.getCPUInfo(),
  memory: await memoryCollector.getMemoryInfo(),
 storage: await storageCollector.getStorageInfo(),
  graphics: await graphicsCollector.getGPUInfo(),
  display: displayCollector.getDisplayInfo(),
  camera: await cameraCollector.getCameraInfo(),
  audio: await audioCollector.getAudioInfo(),
 network: await networkCollector.getNetworkInfo(),
 battery: await batteryCollector.getBatteryInfo(),
  inputDevices: await inputDeviceCollector.getInputDeviceInfo(),
 sensors: await sensorCollector.getSensorInfo()
});

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ghostDeviceInfo;
} else {
  window.ghostDeviceInfo = ghostDeviceInfo;
}
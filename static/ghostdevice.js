const ghostDeviceInfo = {};

// OS Information
const getOSInfo = () => {
  const clientStrings = [
    { s: 'Windows 11', r: /(Windows 11.0|Windows NT 10.0)/ },
    { s: 'Windows Server 2019', r: /(Windows NT 10.0)/ },
    { s: 'Windows Server 2016', r: /(Windows NT 10.0)/ },
    { s: 'Windows Server 2012 R2', r: /(Windows NT 6.3)/ },
    { s: 'Windows Server 2012', r: /(Windows NT 6.2)/ },
    { s: 'Windows Server 2008 R2', r: /(Windows NT 6.1)/ },
    { s: 'Windows Server 2008', r: /(Windows NT 6.0)/ },
    { s: 'Windows Server 2003 R2', r: /(Windows NT 5.2)/ },
    { s: 'Windows Server 2003', r: /(Windows NT 5.2)/ },
    { s: 'Ubuntu', r: /Ubuntu/ },
    { s: 'Fedora', r: /Fedora/ },
    { s: 'FreeBSD', r: /FreeBSD/ },
    { s: 'Chrome OS', r: /CrOS/ },
    { s: 'Solaris', r: /SunOS/ },
    { s: 'CentOS', r: /CentOS/ },
    { s: 'Red Hat Enterprise Linux', r: /Red Hat/ },
    { s: 'Debian', r: /Debian/ },
    { s: 'Mint', r: /Linux Mint/ },
    { s: 'Arch Linux', r: /Arch/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Android', r: /Android/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ }
  ];

  let os = null;
  let osVersion = null;

  for (const { s, r } of clientStrings) {
    if (r.test(window.navigator.userAgent)) {
      os = s;
      break;
    }
  }

  if (/Windows/.test(os)) {
    osVersion = /Windows (.*)/.exec(os)?.[1];
    os = 'Windows';
  }

  osVersion = extractOSVersion(os);

  return `${os} ${osVersion || ''}`;
};

const extractOSVersion = (os) => {
  switch (os) {
    case 'Mac OS':
    case 'Mac OS X':
    case 'Android':
      return /(?:Android|Mac OS|Mac OS X) ([\.\_\d]+)/.exec(navigator.userAgent)?.[1];

    case 'iOS':
      const iosVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(navigator.appVersion);
      return iosVersion ? `${iosVersion[1]}.${iosVersion[2]}.${iosVersion[3] | 0}` : null;

    default:
      return null;
  }
};

const getOldOS = () => {
  const ua = window.navigator.userAgent;
  const platform = window.navigator?.userAgentData?.platform || window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K', 'darwin'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE', 'Windows NT'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  let os = null;

  switch (true) {
    case macosPlatforms.includes(platform):
      os = 'Mac OS';
      break;
    case iosPlatforms.includes(platform):
      os = 'iOS';
      break;
    case windowsPlatforms.includes(platform):
      os = 'Windows';
      break;
    case /Android/.test(ua):
      os = 'Android';
      break;
    case /Linux/.test(platform):
      os = 'Linux';
      break;
    default:
      os = null;
  }

  return os;
};

// Function to determine device architecture
const getArchitecture = () => {
  const platform = window.navigator.platform || window.navigator.userAgentData.platform;

  if (/x86_64|x86-64|Win64|x64;|amd64|AMD64|WOW64|x64_64|MacIntel|Linux x86_64/.test(navigator.userAgent)) {
    return 'arch64';
  } else if (/Linux armv7l|iPad|iPod|iPhone|Android|BlackBerry/.test(platform)) {
    return 'mobile';
  } else if (/Linux i686/.test(platform)) {
    return 'unknown';
  } else {
    return 'arch32';
  }
};

// Function to get the full navigator.platform string
const getPlatformInfo = () => {
  return window.navigator.oscpu  || 'N/A';
};

// Function to get GPU information
const getGPUInfo = () => {
  try {
    if (navigator.gpu) {
      return {
        deviceName: navigator.gpu.deviceName || 'N/A',
        vendorName: navigator.gpu.vendorName || 'N/A',
        webglVersion: navigator.gpu.webglVersion || 'N/A',
      };
    } else {
      return 'N/A';
    }
  } catch (error) {
    console.error('Error getting GPU information:', error);
    return 'N/A';
  }
};

// Feature Support Checks
const isVibrateSupported = () => 'vibrate' in navigator && typeof navigator.vibrate === 'function';
const isNotificationSupported = () => 'Notification' in window && typeof Notification !== 'function';
const isSpeechSupported = () => ('speechRecognition' in window || 'webkitSpeechRecognition' in window) && (window.SpeechRecognition || window.webkitSpeechRecognition);
const isTouchSupported = () => 'ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch);

// Sensor Checks
const hasGyroscope = () => 'DeviceOrientationEvent' in window && 'ontouchstart' in window;
const hasAmbientLightSensor = () => 'ondevicelight' in window;
const hasProximitySensor = () => 'ondeviceproximity' in window;

const getNetworkType = () => {
  if (navigator.connection) {
    return navigator.connection.type;
  } else {
    return 'N/A';
  }
};

const getSimCardInfo = () => {
  if ('mozMobileConnection' in navigator) {
    const mobileConnection = navigator.mozMobileConnection;
    return {
      hasSimCard: mobileConnection.iccId !== null,
      carrier: mobileConnection.iccInfo ? mobileConnection.iccInfo.carrier : 'N/A',
      mobileNetworkCode: mobileConnection.iccInfo ? mobileConnection.iccInfo.mnc : 'N/A',
    };
  } else {
    return 'N/A';
  }
};

const getTouchSupport = () => {
  return 'ontouchstart' in window || ('DocumentTouch' in window && document instanceof window.DocumentTouch);
};

const getScreenInfo = () => {
  return {
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
    },
    screenResolution: {
      width: window.screen.availWidth,
      height: window.screen.availHeight,
    },
    pixelDensity: window.devicePixelRatio || 'N/A',
  };
};

const getModelInfo = () => {
  return navigator.userAgentData ? navigator.userAgentData.brands.map(brand => brand.brand).join(', ') : 'N/A';
};

// Function to get the device's memory in gigabytes
const getDeviceMemory = () => navigator.deviceMemory || null;

// Function to get the number of CPU cores
const getCPUCores = () => navigator.hardwareConcurrency || null;

const getAudioOutputInfo = () => {
  const audioOutput = 'AudioContext' in window ? 'Supported' : 'Not Supported';
  const audioOutputType = audioOutput === 'Supported' ? 'N/A' /* Add logic to determine output type */ : 'N/A';
  return { audioOutput, audioOutputType };
};

// Function to check if the device has a front camera
const hasFrontCamera = () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

// Function to check if the device supports geolocation
const isGeolocationSupported = () => 'geolocation' in navigator;

// Function to check if the device supports accelerometer
const hasAccelerometer = () => 'ondevicemotion' in window;

const hasMotionSupport = () => 'DeviceMotionEvent' in window;

const hasOrientationSupport = () => 'DeviceOrientationEvent' in window;

// Function to check if the device supports magnetometer
const hasMagnetometer = () => 'ondeviceorientationabsolute' in window;

// Function to check if the device supports WebUSB
const isWebUSBSupported = () => 'usb' in navigator;

// Function to check if the device supports WebBluetooth
const isWebBluetoothSupported = () => 'bluetooth' in navigator;

// Function to check if the device supports WebRTC
const isWebRTCSupported = () => 'RTCPeerConnection' in window;

// Function to check if the device supports WebAssembly
const isWebAssemblySupported = () => typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';

// Function to check if the device supports the Gamepad API
const hasGamepadSupport = () => 'getGamepads' in navigator;

// Function to check if the device has audio input devices
const hasAudioInputSupport = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some(device => device.kind === 'audioinput');
};

// Function to check if the device supports Speech Synthesis API
const hasSpeechSynthesisSupport = () => 'speechSynthesis' in window;

// Function to check if the device has a touchscreen and gather information about its capabilities
const getTouchscreenInfo = () => {
  return {
    hasTouchscreen: 'ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch),
    // Add additional touchscreen capabilities if available
  };
};

// Function to obtain information about the device's orientation
const getDeviceOrientationInfo = () => {
  return {
    supportsLandscape: window.matchMedia('(orientation: landscape)').matches,
    supportsPortrait: window.matchMedia('(orientation: portrait)').matches,
    // Add additional orientation information if needed
  };
};

// Function to explore connected USB devices and provide information about them
const getUSBDeviceInfo = async () => {
  try {
    const devices = await navigator.usb.getDevices();
    return devices.map(device => ({
      productName: device.productName,
      vendorName: device.vendorName,
      // Add additional USB device information if needed
    }));
  } catch (error) {
    console.error('Error exploring USB devices:', error);
    return []; // Return an empty array if no devices or an error occurs
  }
};

// Function to list and provide details about connected Bluetooth devices
const getBluetoothDeviceInfo = async () => {
  try {
    const devices = await navigator.bluetooth.getDevices();
    return devices.map(device => ({
      name: device.name,
      id: device.id,
      // Add additional Bluetooth device information if needed
    }));
  } catch (error) {
    console.error('Error getting Bluetooth devices:', error);
    return []; // Return an empty array if no devices or an error occurs
  }
};

// Function to retrieve details about the device's storage capacity, available space, and storage type
const getStorageInfo = () => {
  return {
    storageCapacity: navigator.storage.estimate().then(estimate => estimate.quota),
    availableSpace: navigator.storage.estimate().then(estimate => estimate.usage),
    storageType: navigator.storage && navigator.storage.deviceType,
  };
};

// Function to retrieve information about the device's display density
const getDisplayDensity = () => {
  return window.devicePixelRatio || 'N/A';
};

ghostDeviceInfo.getDeviceInfo = async () => {
  const deviceInfo = {
    operatingSystem: {
      name: getOSInfo(),
      platform: getPlatformInfo(),
      version: extractOSVersion(getOSInfo()),
      legacyVersion: getOldOS(),
    },
    architecture: getArchitecture(),
    graphicsProcessingUnit: getGPUInfo(),
    featureSupport: {
      vibration: isVibrateSupported(),
      notification: isNotificationSupported(),
      speechRecognition: isSpeechSupported(),
      touch: getTouchSupport(),
    },
    sensors: {
      gyroscope: hasGyroscope(),
      ambientLight: hasAmbientLightSensor(),
      proximity: hasProximitySensor(),
      accelerometer: hasAccelerometer(),
      magnetometer: hasMagnetometer(),
      orientation: hasOrientationSupport(),
      motion: hasMotionSupport(),
    },
    network: {
      type: getNetworkType(),
    },
    simCard: getSimCardInfo(),
    display: {
      screen: getScreenInfo(),
      displayDensity: getDisplayDensity(),
    },
    model: {
      brand: getModelInfo(),
    },
    hardware: {
      memory: getDeviceMemory(),
      cpu: {
        cores: getCPUCores(),
      },
      audioOutput: getAudioOutputInfo(),
    },
    connectivity: {
      geolocation: isGeolocationSupported(),
      webUSB: isWebUSBSupported(),
      webBluetooth: isWebBluetoothSupported(),
      webRTC: isWebRTCSupported(),
      webAssembly: isWebAssemblySupported(),
    },
    input: {
      gamepad: hasGamepadSupport(),
      audioInput: await hasAudioInputSupport(),
      speechSynthesis: hasSpeechSynthesisSupport(),
    },
    interaction: {
      touchscreen: getTouchscreenInfo(),
      orientation: getDeviceOrientationInfo(),
    },
    peripherals: {
      usbDevices: await getUSBDeviceInfo(),
      bluetoothDevices: await getBluetoothDeviceInfo(),
    },
    storage: getStorageInfo(),
  };

  return deviceInfo;
};


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ghostDeviceInfo;
} else {
  window.ghostDeviceInfo = ghostDeviceInfo;
}
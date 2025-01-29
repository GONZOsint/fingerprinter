// static/cbf.js

// --- Utility Module ---
const Utils = (() => {
    /**
     * Executes an asynchronous function with error handling.
     * @param {Function} asyncFn - The asynchronous function to execute.
     * @param {String} description - Description for logging purposes.
     * @returns {Object} - { success: Boolean, data: Any, error: String }
     */
    const safeCall = async (asyncFn, description) => {
        try {
            const result = await asyncFn();
            console.log(`[Utils] - SUCCESS: ${description} -`, result);
            return {success: true, data: result};
        } catch (error) {
            console.error(`[Utils] - ERROR: ${description} -`, error);
            return {success: false, error: error.toString()};
        }
    };

    /**
     * Formats components into a readable JSON string.
     * @param {Object} components - The components to format.
     * @returns {String} - Formatted JSON string.
     */
    const formatComponents = (components) => {
        return JSON.stringify(components, null, 2);
    };

    return {
        safeCall,
        formatComponents,
    };
})();

// --- Fingerprint Generation Module ---
const FingerprintGenerator = (() => {
    /**
     * Normalizes the timezone string to a numerical offset from UTC, or returns null if failed.
     * @returns {string|null} - The timezone offset in hours or null.
     */
    const normalizeTimezone = (timezone_str) => {
        if (!timezone_str) {
            return null;
        }
        try {
            const tz = Intl.DateTimeFormat('en-US', {timeZone: timezone_str, timeZoneName: 'longOffset'}).format(new Date())
            const offset = tz.match(/GMT([+-]\d+)/)[1]
            return String(parseInt(offset))
        } catch (e) {
            console.error("Error normalizing timezone:", e)
            return null;
        }
    };
    /**
     * Normalizes screen resolution to a single ratio, handling possible division by zero.
     * @param {Object} screen_size - The screen size object.
     * @param {Object} screen_resolution - The screen resolution object.
     * @returns {number|null} - The normalized screen resolution ratio or null.
     */
    const normalizeScreenResolution = (screen_size, screen_resolution) => {
        if (!screen_size || !screen_resolution) {
            return null;
        }
        try {
            const widthRatio = screen_resolution.width / screen_size.width || null;
            const heightRatio = screen_resolution.height / screen_size.height || null;

            if (widthRatio === null || heightRatio === null) {
                return null;
            }
            return (widthRatio + heightRatio) / 2;
        } catch (e) {
            console.error("Error normalizing screen resolution:", e);
            return null;
        }
    };

    /**
     * Extracts cross-browser features, including normalized language code.
     * @param {Object} data - The fingerprint data.
     * @returns {Object|null} - The extracted features or null if an error occurs.
     */

    const extractFeatures = (data) => {
        try {
            const ghostDeviceInfo = data?.ghostDeviceInfo;
            const math_data = data?.thumbmarkjs?.math;
            const clientjs = data?.clientjs;
            const opfsFingerprint = data?.opfsFingerprint;
            const thumbmarkjs = data?.thumbmarkjs;
            const ghostIPData = data?.ghostIPData;

            const features = {
                'ghostDeviceInfo.audio.features': String(ghostDeviceInfo?.audio?.features ? JSON.stringify(ghostDeviceInfo.audio.features) : ''),
                'ghostDeviceInfo.audio.features.autoGainControl': String(ghostDeviceInfo?.audio?.features?.autoGainControl),
                'ghostDeviceInfo.storage.deviceType.confidence': String(ghostDeviceInfo?.storage?.deviceType?.confidence),
                'thumbmarkjs.audio.maxChannels': String(thumbmarkjs?.audio?.maxChannels),
                'ghostDeviceInfo.display.screen.colorDepth': String(ghostDeviceInfo?.display?.screen?.colorDepth),
                'ghostDeviceInfo.cpu.architecture': String(ghostDeviceInfo?.cpu?.architecture),
                'clientjs.isMobileIOS': String(clientjs?.isMobileIOS),
                'ghostDeviceInfo.sensors.motion.accelerometer': String(ghostDeviceInfo?.sensors?.motion?.accelerometer),
                'thumbmarkjs.permissions.geolocation': String(thumbmarkjs?.permissions?.geolocation),
                'ghostDeviceInfo.inputDevices.pointing.precision': String(ghostDeviceInfo?.inputDevices?.pointing?.precision),
                'opfsFingerprint.additionalInfo.applePay': String(opfsFingerprint?.additionalInfo?.applePay),
                'ghostDeviceInfo.display.hdrSupport': String(ghostDeviceInfo?.display?.hdrSupport ? JSON.stringify(ghostDeviceInfo.display.hdrSupport) : ''),
                'ghostDeviceInfo.inputDevices.touch': String(ghostDeviceInfo?.inputDevices?.touch ? JSON.stringify(ghostDeviceInfo.inputDevices.touch) : ''),
                'ghostDeviceInfo.display.multipleDisplays': String(ghostDeviceInfo?.display?.multipleDisplays),
                'clientjs.isIphone': String(clientjs?.isIphone),
                'thumbmarkjs.permissions.microphone': String(thumbmarkjs?.permissions?.microphone),
                'opfsFingerprint.additionalInfo.invertedColors': String(opfsFingerprint?.additionalInfo?.invertedColors),
                'opfsFingerprint.additionalInfo.hdr': String(opfsFingerprint?.additionalInfo?.hdr),
                'thumbmarkjs.screen.colorDepth': String(thumbmarkjs?.screen?.colorDepth),
                'ghostDeviceInfo.audio.features.noiseSuppression': String(ghostDeviceInfo?.audio?.features?.noiseSuppression),
                'clientjs.isMobileWindows': String(clientjs?.isMobileWindows),
                'ghostDeviceInfo.graphics.capabilities.maxVaryingVectors': String(ghostDeviceInfo?.graphics?.capabilities?.maxVaryingVectors),
                'ghostDeviceInfo.cpu.capabilities': String(ghostDeviceInfo?.cpu?.capabilities ? JSON.stringify(ghostDeviceInfo.cpu.capabilities) : ''),
                'clientjs.isSolaris': String(clientjs?.isSolaris),
                'thumbmarkjs.math.sinh': String(math_data?.sinh),
                'clientjs.isMobile': String(clientjs?.isMobile),
                'opfsFingerprint.additionalInfo.monochrome': String(opfsFingerprint?.additionalInfo?.monochrome),
                'opfsFingerprint.additionalInfo.errorToSource': String(opfsFingerprint?.additionalInfo?.errorToSource),
                'ghostIPData.country': String(ghostIPData?.country),
                'ghostDeviceInfo.audio.features.midi': String(ghostDeviceInfo?.audio?.features?.midi),
                'ghostDeviceInfo.storage.quota': String(ghostDeviceInfo?.storage?.quota),
                'ghostDeviceInfo.graphics.contextAttributes.preserveDrawingBuffer': String(ghostDeviceInfo?.graphics?.contextAttributes?.preserveDrawingBuffer),
                'thumbmarkjs.math.sin': String(math_data?.sin),
                'ghostDeviceInfo.memory.sharedMemorySupport': String(ghostDeviceInfo?.memory?.sharedMemorySupport),
                'thumbmarkjs.math.log': String(math_data?.log),
                'thumbmarkjs.math.e': String(math_data?.e),
                'ghostDeviceInfo.sensors.orientation.absolute': String(ghostDeviceInfo?.sensors?.orientation?.absolute),
                'ghostDeviceInfo.display.refreshRate': String(ghostDeviceInfo?.display?.refreshRate),
                'opfsFingerprint.additionalInfo.reducedMotion': String(opfsFingerprint?.additionalInfo?.reducedMotion),
                'thumbmarkjs.audio.oscillator': String(thumbmarkjs?.audio?.oscillator),
                'clientjs.isOpera': String(clientjs?.isOpera),
                'clientjs.isFlash': String(clientjs?.isFlash),
                'ghostDeviceInfo.storage.persistent': String(ghostDeviceInfo?.storage?.persistent),
                'clientjs.getBrowserData.cpu.architecture': String(clientjs?.getBrowserData?.cpu?.architecture),
                'ghostDeviceInfo.display.screen.orientation.angle': String(ghostDeviceInfo?.display?.screen?.orientation?.angle),
                'clientjs.isSilverlight': String(clientjs?.isSilverlight),
                'ghostIPData.ip': String(ghostIPData?.ip),
                'ghostIPData.region': String(ghostIPData?.region),
                'clientjs.isSafari': String(clientjs?.isSafari),
                'opfsFingerprint.additionalInfo.notifications': String(opfsFingerprint?.additionalInfo?.notifications),
                'thumbmarkjs.permissions.persistent-storage': String(thumbmarkjs?.permissions['persistent-storage']),
                'clientjs.isCookie': String(clientjs?.isCookie),
                'ghostDeviceInfo.storage.deviceType.metrics.sampleSize': String(ghostDeviceInfo?.storage?.deviceType?.metrics?.sampleSize),
                'clientjs.isIE': String(clientjs?.isIE),
                'ghostDeviceInfo.cpu.capabilities.atomics': String(ghostDeviceInfo?.cpu?.capabilities?.atomics),
                'ghostDeviceInfo.memory.pressureLevel': String(ghostDeviceInfo?.memory?.pressureLevel),
                'ghostDeviceInfo.sensors.orientation': String(ghostDeviceInfo?.sensors?.orientation ? JSON.stringify(ghostDeviceInfo.sensors.orientation) : ''),
                'ghostDeviceInfo.inputDevices.touch.touchScreen': String(ghostDeviceInfo?.inputDevices?.touch?.touchScreen),
                'ghostDeviceInfo.graphics.capabilities.maxCubemapSize': String(ghostDeviceInfo?.graphics?.capabilities?.maxCubemapSize),
                'thumbmarkjs.math.largeTan': String(math_data?.largeTan),
                'ghostDeviceInfo.camera.count': String(ghostDeviceInfo?.camera?.count),
                'thumbmarkjs.math.acos': String(math_data?.acos),
                'ghostDeviceInfo.sensors.light': String(ghostDeviceInfo?.sensors?.light ? JSON.stringify(ghostDeviceInfo.sensors.light) : ''),
                'thumbmarkjs.math.asin': String(math_data?.asin),
                'thumbmarkjs.permissions.notifications': String(thumbmarkjs?.permissions?.notifications),
                'ghostDeviceInfo.cpu.performanceMetrics.unit': String(ghostDeviceInfo?.cpu?.performanceMetrics?.unit),
                'opfsFingerprint.additionalInfo.colorDepth': String(opfsFingerprint?.additionalInfo?.colorDepth),
                'ghostDeviceInfo.cpu.capabilities.simd': String(ghostDeviceInfo?.cpu?.capabilities?.simd),
                'clientjs.isLinux': String(clientjs?.isLinux),
                'thumbmarkjs.permissions.midi': String(thumbmarkjs?.permissions?.midi),
                'ghostDeviceInfo.graphics.contextAttributes.antialias': String(ghostDeviceInfo?.graphics?.contextAttributes?.antialias),
                'ghostDeviceInfo.graphics.contextAttributes.powerPreference': String(ghostDeviceInfo?.graphics?.contextAttributes?.powerPreference),
                'clientjs.getJavaVersion': String(clientjs?.getJavaVersion),
                'clientjs.osVersion': String(clientjs?.osVersion),
                'ghostDeviceInfo.inputDevices.pointing.primaryInput': String(ghostDeviceInfo?.inputDevices?.pointing?.primaryInput),
                'ghostDeviceInfo.sensors.permissions.ambient-light-sensor': String(ghostDeviceInfo?.sensors?.permissions?.['ambient-light-sensor']),
                'ghostDeviceInfo.network.performanceMetrics.type': String(ghostDeviceInfo?.network?.performanceMetrics?.type),
                'ghostIPData': String(ghostIPData ? JSON.stringify(ghostIPData) : ''),
                'opfsFingerprint.additionalInfo.getAttributeNames': String(opfsFingerprint?.additionalInfo?.getAttributeNames),
                'ghostDeviceInfo.display.resolution.physical.height': String(ghostDeviceInfo?.display?.resolution?.physical?.height),
                'clientjs.getBrowserData.cpu': String(clientjs?.getBrowserData?.cpu ? JSON.stringify(clientjs.getBrowserData.cpu) : ''),
                'thumbmarkjs.system.applePayVersion': String(thumbmarkjs?.system?.applePayVersion),
                'ghostDeviceInfo.cpu.capabilities.threads': String(ghostDeviceInfo?.cpu?.capabilities?.threads),
                'thumbmarkjs.math.tanh': String(math_data?.tanh),
                'thumbmarkjs.system.product': String(thumbmarkjs?.system?.product),
                'ghostDeviceInfo.graphics.contextAttributes.depth': String(ghostDeviceInfo?.graphics?.contextAttributes?.depth),
                'ghostDeviceInfo.inputDevices.keyboard.present': String(ghostDeviceInfo?.inputDevices?.keyboard?.present),
                'opfsFingerprint.additionalInfo.contrast': String(opfsFingerprint?.additionalInfo?.contrast),
                'clientjs.isFont': String(clientjs?.isFont),
                'clientjs.isLocalStorage': String(clientjs?.isLocalStorage),
                'ghostDeviceInfo.camera': String(ghostDeviceInfo?.camera ? JSON.stringify(ghostDeviceInfo.camera) : ''),
                'ghostDeviceInfo.display.screen.pixelDepth': String(ghostDeviceInfo?.display?.screen?.pixelDepth),
                'thumbmarkjs.system.platform': String(thumbmarkjs?.system?.platform),
                'thumbmarkjs.math.largeCos': String(math_data?.largeCos),
                'ghostDeviceInfo.audio.capabilities.sampleRate': String(ghostDeviceInfo?.audio?.capabilities?.sampleRate),
                'ghostDeviceInfo.sensors.light.supported': String(ghostDeviceInfo?.sensors?.light?.supported),
                'ghostDeviceInfo.graphics.capabilities.maxViewportDims.0': String(ghostDeviceInfo?.graphics?.capabilities?.maxViewportDims?.[0]),
                'ghostDeviceInfo.storage.deviceType.likely': String(ghostDeviceInfo?.storage?.deviceType?.likely),
                'opfsFingerprint.additionalInfo.timezoneOffset': String(opfsFingerprint?.additionalInfo?.timezoneOffset),
                'clientjs.isMac': String(clientjs?.isMac),
                'clientjs.getCustomFingerprint': String(clientjs?.getCustomFingerprint),
                'ghostDeviceInfo.inputDevices.touch.maxTouchPoints': String(ghostDeviceInfo?.inputDevices?.touch?.maxTouchPoints),
                'thumbmarkjs.permissions.camera': String(thumbmarkjs?.permissions?.camera),
                'thumbmarkjs.hardware.architecture': String(thumbmarkjs?.hardware?.architecture),
                'thumbmarkjs.math.atan': String(math_data?.atan),
                'opfsFingerprint.additionalInfo.pluginLengthIsZero': String(opfsFingerprint?.additionalInfo?.pluginLengthIsZero),
                'ghostDeviceInfo.inputDevices.touch.coarsePrimary': String(ghostDeviceInfo?.inputDevices?.touch?.coarsePrimary),
                'ghostDeviceInfo.sensors.environmental': String(ghostDeviceInfo?.sensors?.environmental ? JSON.stringify(ghostDeviceInfo.sensors.environmental) : ''),
                'ghostDeviceInfo.graphics.hardwareAcceleration': String(ghostDeviceInfo?.graphics?.hardwareAcceleration ? JSON.stringify(ghostDeviceInfo.graphics.hardwareAcceleration) : ''),
                'thumbmarkjs.math.cos': String(math_data?.cos),
                'ghostDeviceInfo.sensors.environmental.ambientLight': String(ghostDeviceInfo?.sensors?.environmental?.ambientLight),
                'clientjs.isWindows': String(clientjs?.isWindows),
                'thumbmarkjs.locales.timezone': String(thumbmarkjs?.locales?.timezone),
                'thumbmarkjs.math.cosh': String(math_data?.cosh),
                'clientjs.isUbuntu': String(clientjs?.isUbuntu),
                'ghostDeviceInfo.inputDevices.pointing.hasPointer': String(ghostDeviceInfo?.inputDevices?.pointing?.hasPointer),
                'ghostDeviceInfo.audio.inputs': String(ghostDeviceInfo?.audio?.inputs ? JSON.stringify(ghostDeviceInfo.audio.inputs) : ''),
                'opfsFingerprint.additionalInfo.platform': String(opfsFingerprint?.additionalInfo?.platform),
                'ghostDeviceInfo.graphics.capabilities.maxViewportDims.1': String(ghostDeviceInfo?.graphics?.capabilities?.maxViewportDims?.[1]),
                'thumbmarkjs.audio.channelCountMode': String(thumbmarkjs?.audio?.channelCountMode),
                'thumbmarkjs.math': String(math_data ? JSON.stringify(math_data) : ''),
                'ghostDeviceInfo.graphics.contextAttributes.premultipliedAlpha': String(ghostDeviceInfo?.graphics?.contextAttributes?.premultipliedAlpha),
                'thumbmarkjs.math.sqrt': String(math_data?.sqrt),
                'ghostDeviceInfo.display.hdrSupport.colorDepth': String(ghostDeviceInfo?.display?.hdrSupport?.colorDepth),
                'ghostDeviceInfo.graphics.contextAttributes.alpha': String(ghostDeviceInfo?.graphics?.contextAttributes?.alpha),
                'ghostDeviceInfo.sensors.proximity.supported': String(ghostDeviceInfo?.sensors?.proximity?.supported),
                'ghostDeviceInfo.inputDevices.biometric.platformAuthenticator': String(ghostDeviceInfo?.inputDevices?.biometric?.platformAuthenticator),
                'clientjs.getBrowserData.os.name': String(clientjs?.getBrowserData?.os?.name),
                'ghostDeviceInfo.graphics.hardwareAcceleration.webGL': String(ghostDeviceInfo?.graphics?.hardwareAcceleration?.webGL),
                'clientjs.colorDepth': String(clientjs?.colorDepth),
                'ghostDeviceInfo.graphics.capabilities.maxFragmentUniformVectors': String(ghostDeviceInfo?.graphics?.capabilities?.maxFragmentUniformVectors),
                'thumbmarkjs.math.tan': String(math_data?.tan),
                'ghostDeviceInfo.audio.features.spatialAudio': String(ghostDeviceInfo?.audio?.features?.spatialAudio),
                'clientjs.getFlashVersion': String(clientjs?.getFlashVersion),
                'clientjs.isMobileOpera': String(clientjs?.isMobileOpera),
                'opfsFingerprint.additionalInfo.cpuClass': String(opfsFingerprint?.additionalInfo?.cpuClass),
                'clientjs.getBrowserData.os': String(clientjs?.getBrowserData?.os ? JSON.stringify(clientjs.getBrowserData.os) : ''),
                'thumbmarkjs.math.largeSin': String(math_data?.largeSin),
                'opfsFingerprint.additionalInfo.sharedArrayBuffer': String(opfsFingerprint?.additionalInfo?.sharedArrayBuffer),
                'ghostDeviceInfo.display.screen.orientation': String(ghostDeviceInfo?.display?.screen?.orientation ? JSON.stringify(ghostDeviceInfo.display.screen.orientation) : ''),
                'opfsFingerprint.additionalInfo.timezone': String(opfsFingerprint?.additionalInfo?.timezone),
                'ghostDeviceInfo.graphics.capabilities.maxVertexAttributes': String(ghostDeviceInfo?.graphics?.capabilities?.maxVertexAttributes),
                'clientjs.isIpod': String(clientjs?.isIpod),
                'clientjs.os': String(clientjs?.os),
                'opfsFingerprint.additionalInfo.webdriver': String(opfsFingerprint?.additionalInfo?.webdriver),
                'thumbmarkjs.screen.maxTouchPoints': String(thumbmarkjs?.screen?.maxTouchPoints),
                'ghostDeviceInfo.inputDevices.touch.finePrimary': String(ghostDeviceInfo?.inputDevices?.touch?.finePrimary),
                'clientjs.cpu': String(clientjs?.cpu),
                'opfsFingerprint.additionalInfo.forcedColors': String(opfsFingerprint?.additionalInfo?.forcedColors),
                'ghostDeviceInfo.graphics.contextAttributes.stencil': String(ghostDeviceInfo?.graphics?.contextAttributes?.stencil),
                'ghostDeviceInfo.display.screen.orientation.type': String(ghostDeviceInfo?.display?.screen?.orientation?.type),
                'ghostDeviceInfo.graphics.contextAttributes.failIfMajorPerformanceCaveat': String(ghostDeviceInfo?.graphics?.contextAttributes?.failIfMajorPerformanceCaveat),
                'ghostDeviceInfo.inputDevices.biometric.credentials': String(ghostDeviceInfo?.inputDevices?.biometric?.credentials),
                'ghostDeviceInfo.storage.performance': String(ghostDeviceInfo?.storage?.performance),
                'ghostDeviceInfo.display.screen.deviceXDPI': String(ghostDeviceInfo?.display?.screen?.deviceXDPI),
                'clientjs.isSessionStorage': String(clientjs?.isSessionStorage),
                'opfsFingerprint.additionalInfo.attributionsourceid': String(opfsFingerprint?.additionalInfo?.attributionsourceid),
                'clientjs.timeZone': String(clientjs?.timeZone),
                'ghostDeviceInfo.inputDevices.biometric': String(ghostDeviceInfo?.inputDevices?.biometric ? JSON.stringify(ghostDeviceInfo.inputDevices.biometric) : ''),
                'clientjs.isIpad': String(clientjs?.isIpad),
                'ghostDeviceInfo.graphics.capabilities.maxTextureSize': String(ghostDeviceInfo?.graphics?.capabilities?.maxTextureSize),
                'opfsFingerprint.additionalInfo.maxTouchPoints': String(opfsFingerprint?.additionalInfo?.maxTouchPoints),
                'opfsFingerprint.additionalInfo.sourceBuffer': String(opfsFingerprint?.additionalInfo?.sourceBuffer),
                'ghostIPData.city': String(ghostIPData?.city),
                'clientjs.isMobileBlackBerry': String(clientjs?.isMobileBlackBerry),
                'ghostDeviceInfo.inputDevices.virtualReality.vrDisplay': String(ghostDeviceInfo?.inputDevices?.virtualReality?.vrDisplay),
                'ghostDeviceInfo.audio.capabilities.maxChannelCount': String(ghostDeviceInfo?.audio?.capabilities?.maxChannelCount),
                'thumbmarkjs.system.cookieEnabled': String(thumbmarkjs?.system?.cookieEnabled),
                'ghostDeviceInfo.network.onLine': String(ghostDeviceInfo?.network?.onLine),
                'ghostDeviceInfo.inputDevices.virtualReality.features.orientation': String(ghostDeviceInfo?.inputDevices?.virtualReality?.features?.orientation),
                'thumbmarkjs.math.pi': String(math_data?.pi),
                'ghostDeviceInfo.audio.features.echoCancellation': String(ghostDeviceInfo?.audio?.features?.echoCancellation),
                'ghostDeviceInfo.sensors.proximity': String(ghostDeviceInfo?.sensors?.proximity ? JSON.stringify(ghostDeviceInfo.sensors.proximity) : ''),
                'thumbmarkjs.screen.is_touchscreen': String(thumbmarkjs?.screen?.is_touchscreen),
                'ghostDeviceInfo.inputDevices.pointing.maxPointers': String(ghostDeviceInfo?.inputDevices?.pointing?.maxPointers),
                'clientjs.isJava': String(clientjs?.isJava),
                'clientjs.isCanvas': String(clientjs?.isCanvas),
                'ghostDeviceInfo.sensors.motion': String(ghostDeviceInfo?.sensors?.motion ? JSON.stringify(ghostDeviceInfo.sensors.motion) : ''),
                'ghostDeviceInfo.graphics.capabilities.maxRenderbufferSize': String(ghostDeviceInfo?.graphics?.capabilities?.maxRenderbufferSize),
                'ghostDeviceInfo.display.hdrSupport.hdrSupported': String(ghostDeviceInfo?.display?.hdrSupport?.hdrSupported),
                'ghostDeviceInfo.inputDevices.pointing': String(ghostDeviceInfo?.inputDevices?.pointing ? JSON.stringify(ghostDeviceInfo.inputDevices.pointing) : ''),
                'ghostDeviceInfo.graphics.hardwareAcceleration.canvas2D': String(ghostDeviceInfo?.graphics?.hardwareAcceleration?.canvas2D),
                'clientjs.getBrowserData.os.version': String(clientjs?.getBrowserData?.os?.version),
                'ghostDeviceInfo.sensors.motion.gyroscope': String(ghostDeviceInfo?.sensors?.motion?.gyroscope),
                'ghostDeviceInfo.display.screen.deviceYDPI': String(ghostDeviceInfo?.display?.screen?.deviceYDPI),
                'clientjs.isMobileMajor': String(clientjs?.isMobileMajor),
                'ghostDeviceInfo.graphics.capabilities.maxViewportDims': String(ghostDeviceInfo?.graphics?.capabilities?.maxViewportDims ? JSON.stringify(ghostDeviceInfo.graphics.capabilities.maxViewportDims) : ''),
                'clientjs.isMobileAndroid': String(clientjs?.isMobileAndroid),
                'clientjs.isMimeTypes': String(clientjs?.isMimeTypes),
            };

            console.log("[FingerprintGenerator] - Extracted Features:", features);
            return features;
        } catch (e) {
            console.error("[FingerprintGenerator] - Error extracting features:", e);
            return null;
        }
    };

    /**
     * Generates a SHA-256 hash from the extracted features.
     * @param {Object} features - The extracted features.
     * @returns {Promise<string|null>} - The SHA-256 hash or null if an error occurs.
     */
    const generateHash = async (features) => {
        try {
            const stringified = JSON.stringify(features, Object.keys(features).sort());
            const encoded = new TextEncoder().encode(stringified);
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log("[FingerprintGenerator] - Generated hash:", hashHex);
            return hashHex;
        } catch (e) {
            console.error("[FingerprintGenerator] - Error generating hash:", e);
            return null;
        }
    };

    /**
     * Calculates the cross-browser ID from the fingerprint data.
     * @param {Object} data - The fingerprint data.
     * @returns {Promise<string|null>} - The cross-browser ID or null if an error occurs.
     */
    const calculateCrossBrowserId = async (data) => {
        try {
            const features = extractFeatures(data);
            if (features) {
                return await generateHash(features);
            } else {
                console.error("[FingerprintGenerator] - Could not extract features.");
                return null;
            }
        } catch (e) {
            console.error("[FingerprintGenerator] - Error calculating cross-browser ID:", e);
            return null;
        }
    };

    return {
        calculateCrossBrowserId,
    };
})();

// --- Application Module ---
const App = (() => {

    /**
     * Displays the cross-browser ID on the page.
     * @param {string} crossBrowserId - The cross-browser ID to display.
     */
    const displayCrossBrowserId = (crossBrowserId) => {
        const crossBrowserIdElement = document.getElementById('cross-browser-id');
        if (crossBrowserId) {
            crossBrowserIdElement.textContent = `Cross-Browser ID: ${crossBrowserId}`;
        } else {
            crossBrowserIdElement.textContent = "Could not calculate cross-browser ID due to an error.";
        }
    };
    /**
     * Calculates and displays the cross-browser ID from the given data
     * @param {object} data - All fingerprints data.
     */
    const calculateAndDisplay = async (data) => {
        try {
           const crossBrowserId = await FingerprintGenerator.calculateCrossBrowserId(data);
           displayCrossBrowserId(crossBrowserId);
         } catch(error){
              console.error('[cbf.App] - ERROR: Error calculating and displaying cross-browser ID:', error);
         }
    }

    return {
        calculateAndDisplay,
    };
})();

export { App };
<div align='center'>
  <img src="static/icon.png" width="15%"> 
  <h1>FINGERPRINTER</h1>
</div>

## 🌐 Overview

**FINGERPRINTER** is a web application designed to raise user awareness and fortify online identities against tracking techniques. The dashboard allows users to explore their browser's unique digital profile with ease. With a comprehensive set of fingerprinting identifiers and the **Cross Browser ID** feature, FINGERPRINTER provides an in-depth analysis of your online footprint across different browsers.

## 🚀 Getting Started

Explore the FINGERPRINTER dashboard [online](https://gonzosint.github.io/fingerprinter).

## 🔄 Compare Fingerprints

Evaluate your browser's privacy level by checking if the identifier changes under different conditions:

- **Each time you open the browser**
- **After clearing data**
- **In incognito mode**
- **In other browser**

**Indicators:**

- 🟢 **Unique Identifier Each Time:** Indicates a higher level of privacy, making tracking more difficult.
- 🔴 **Consistent Identifier:** Suggests a lower privacy level, increasing the risk of being tracked.

## 🔍 Unique Identifiers

FINGERPRINTER utilizes a variety of fingerprinting libraries to generate unique identifiers. These identifiers help assess how easily your browser can be tracked across different sessions and environments. Below is a unified list of all integrated fingerprinting methods:

- [ThumbmarkJS](https://thumbmarkjs.com/)
- [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs)
- [ClientJS](https://clientjs.org/)
- [ImprintJS](https://github.com/mattbrailsford/imprintjs)
- [DetectIncognitoJS](https://github.com/Joe12387/detectIncognito)
- [OPFS Fingerprinting Script](https://github.com/Joe12387/OP-Fingerprinting-Script)
- [CanvasprintJS](https://github.com/rylans/canvasprintjs)
- [BrowserSignature](https://cdn.jsdelivr.net/npm/browser-signature)
- [CUID](https://cdn.jsdelivr.net/npm/browser-fingerprint)
- [GhostIP](https://github.com/GONZOsint/fingerprinter/blob/main/static/ghostip.js) 
- [GhostDeviceInfo](https://github.com/GONZOsint/fingerprinter/blob/main/static/ghostdevice.js) 
- [get-browser-fingerprint](https://cdn.jsdelivr.net/npm/get-browser-fingerprint) 

Each of these identifiers employs different techniques to capture unique aspects of your browser and device, contributing to a comprehensive fingerprint profile.

For more information on browser fingerprinting, refer to the following resources:

- [Electronic Frontier Foundation (EFF) - Browser Fingerprinting](https://www.eff.org/pages/browser-fingerprinting)
- [Mozilla - Fingerprinting](https://wiki.mozilla.org/Fingerprinting)
- [W3C - Fingerprinting Guidance](https://www.w3.org/TR/fingerprinting-guidance/)

## 🧩 Cross Browser ID (Work In Progress... Not completed)

**Cross Browser ID** is a feature that consolidates fingerprint data from multiple browsers to generate a unified identifier. This allows users to understand how consistent their digital fingerprint is across different browsers, enhancing privacy insights.

**How It Works:**

1. **Data Collection:** FINGERPRINTER collects just hardware data using various techniques.
2. **Consolidation:** The collected information is processed to generate a **Cross Browser ID**.
3. **Analysis:** Users can compare this ID to assess the consistency and uniqueness of their fingerprints across browsers.

**Benefits:**

- **Enhanced Privacy Insights:** Understand the uniformity of your online identity across multiple browsers.
- **Tracking Resistance:** Identify discrepancies that might aid in tracking your online activities.

## IP Data

FINGERPRINTER uses the [ipdata](https://ipdata.co/) service to retrieve information about the user's IP address, providing additional context to enhance the digital profile. This includes details such as:

- **IP Address**
- **Country**
- **Region**
- **City**

## 👻 GhostDevice Information

This section provides a detailed breakdown of the user's device environment, covering:

- **Device Environment**
  - Operating System
  - Architecture
  - Graphics Processing Unit

- **Feature Support**
  - Vibration
  - Notification
  - Speech Recognition
  - Touch

- **Sensors**
  - Gyroscope
  - Ambient Light
  - Proximity
  - Accelerometer
  - Magnetometer
  - Orientation
  - Motion

- **Connectivity**
  - Network Type
  - SIM Card Details
  - Display Information
  - Model Information
  - Hardware Specifications (memory, CPU cores, audio output)
  - Connectivity Status (geolocation, WebUSB, WebBluetooth, WebRTC, WebAssembly)

- **Input Devices**
  - Gamepad
  - Audio Input
  - Speech Synthesis

- **Interaction Capabilities**
  - Touchscreen
  - Orientation

- **Peripherals**
  - Connected USB Devices
  - Bluetooth Devices

- **Storage Information**

This comprehensive information helps users understand the various attributes that contribute to their device's fingerprint.

## ⚙️ Install and Use Locally

To run FINGERPRINTER locally, follow these steps:

1. **Clone the repository:**
    ```bash
    git clone https://github.com/gonzosint/fingerprinter.git
    ```
   
2. **Navigate to the project directory:**
    ```bash
    cd fingerprinter
    ```
   
3. **Open the application:**
    - Open the `index.html` file in your preferred web browser.
    - Alternatively, serve the application using a local server for better performance:
      ```bash
      # Using Python's simple HTTP server
      python -m http.server 8000
      ```
      Then navigate to `http://localhost:8000` in your browser.

## 🛡️ Recommendations

For an enhanced privacy experience, consider using privacy-focused browsers:

- [Mozilla Firefox](https://www.mozilla.org/): Highly customizable with numerous privacy extensions. Configure Firefox for enhanced privacy using [this guide](https://www.privacyguides.org/en/desktop-browsers/#firefox).
- [Brave](https://brave.com/): Blocks trackers and ads by default, ensuring faster and safer browsing. Learn more [here](https://www.privacyguides.org/en/desktop-browsers/#brave).
- [Mullvad](https://mullvad.net/): Offers integrated VPN services for added anonymity. Find the browser guide [here](https://www.privacyguides.org/en/desktop-browsers/#mullvad-browser).
- Explore the recommended mobile browsers guide [here](https://www.privacyguides.org/en/mobile-browsers/)
- Use [PrivacyTests](https://privacytests.org/), an open-source platform offering tests specifically designed to assess web browser privacy.

Additionally, stay updated on privacy threats and best practices by exploring resources like [privacyguides.org](https://privacyguides.org/).


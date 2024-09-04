var { ai_summary, WSPayload, SwisscowsPuppet, TrackerPayload, Tracker, ScreenshotPayload, Screenshot } = class SC_API {
  static AI_ROUTE = new URL(`https://summarizer.dev.swisscows.com/summarize`)

  static async ai_summary(website, language = 'en') {
    let url = new URL(SC_API.AI_ROUTE)
    url.searchParams.set('url', new URL(website))
    url.searchParams.set('language', language)
    return await (await fetch(url, { method: 'POST' }))?.text?.()
  }

  // ---

  static WSPayload = class WSPayload {
    /**
     * Constructs an instance of Payload.
     * @param {string} url - The URL to be processed.
     * @param {string} imageType - The type of the image (e.g., jpeg, png).
     * @param {number} imageQuality - The quality of the image (0-100).
     * @param {number} width - The width of the viewport.
     * @param {number} height - The height of the viewport.
     * @param {string} waitForEvent - Event to wait for before capturing the screenshot (e.g., networkidle0).
     */
    constructor(url, imageType, imageQuality, width, height, waitForEvent) {
      this.url = url;

      this.imageType = imageType;

      this.imageQuality = imageQuality;
      this.width = width;
      this.height = height;

      // Puppeteer's waitForEvent
      this.waitForEvent = waitForEvent;
    }

    /**
     * The URL to be processed
     * @type {string}
     */
    url;

    /**
     * The type of the image (e.g., jpeg, png)
     * @type {string}
     */
    imageType;

    /**
     * The quality of the image (0-100)
     * @type {number}
     */
    imageQuality;

    /**
     * The width of the viewport
     * @type {number}
     */
    width;

    /**
     * The height of the viewport
     * @type {number}
     */
    height;

    /**
     * Event to wait for before capturing the screenshot (e.g., networkidle0)
     * @type {string}
     */
    waitForEvent;
  }

  static SwisscowsPuppet = class SwisscowsPuppet {
    /**
     * WebSocket endpoint URL for Swisscows Puppet.
     * @type {URL}
     */
    static ws = new URL("wss://browse.dev.swisscows.com/ws/");

    /**
     * Instance of WebSocket connection.
     * @type {WebSocket | null}
     */
    ws_instance = null;

    /**
     * Connects to the WebSocket server and assigns the connection instance.
     * @returns {WebSocket} The WebSocket connection instance.
     */
    connect() { return this.ws_instance = new WebSocket(this.ws) }

    /**
     * Sends a payload through the WebSocket connection.
     * @param {InstanceType<typeof SC_API.WSPayload>} payload - The data to be sent through WebSocket.
     */
    send(payload) {
      if (this.ws_instance && this.ws_instance.readyState === WebSocket.OPEN)
        this.ws_instance.send(JSON.stringify(payload));
      else console.error("WebSocket is not open. Unable to send payload.");
    }

    /**
     * Closes the WebSocket connection.
     */
    close() { this.ws_instance.close() }
  }

  // ---

  static TypedData(data, type) { return { type, data } }

  // ---

  static Tracker = class {
    static FingerprintingGeneral_category = 'FingerprintingGeneral'
    static Advertising_category = 'Advertising'
    static Content_category = 'Content'

    /**
     * Constructs an instance of Tracker.
     * @param {string} name - The name of the tracker.
     * @param {string} baseUrl - The base URL of the tracker.
     * @param {string} category - The category of the tracker.
     */
    constructor(name, baseUrl, category) {
      this.name = name;
      this.baseUrl = baseUrl;
      this.category = category;
    }

    /**
     * The name of the tracker.
     * @type {string}
     */
    name;

    /**
     * The base URL of the tracker.
     * @type {string}
     */
    baseUrl;

    /**
     * The category of the tracker.
     * @type {string}
     */
    category;
  }

  /**
   * Constructs a TrackerPayload object.
   * @param {string} name - The name of the tracker.
   * @param {string} baseUrl - The base URL of the tracker.
   * @param {string} category - The category of the tracker.
   * @returns {object} An object containing the tracker data and its type.
   */
  static TrackerPayload(name, baseUrl, category) {
    return SC_API.TypedData(new SC_API.Tracker(name, baseUrl, category), "tracker");
  }

  // ---

  static Screenshot = class Screenshot {
    /**
     * Generates image options for a given URI and image element.
     * @param {string} uri - The URI of the image.
     * @param {HTMLImageElement} img - The image element.
     * @param {Function} resolve - The resolve function of the Promise.
     * @returns {object} The image options object.
     */
    static makeImgOpts(uri, img, resolve) {
      function fail() { img.remove(), resolve(false) }
      function pass() { img.remove(), resolve(true) }
      return {
        src: uri,
        onload: pass,
        onerror: fail,
        onabort: fail,
      }
    }

    /**
     * Tests if a URI is valid and can be loaded as an image.
     * @param {string} uri - The URI to test.
     * @returns {Promise<boolean>} A promise that resolves to true if the URI is valid, otherwise false.
     */
    static testURI(uri) {
      return new Promise(res => {
        let img = new Image();
        Object.assign(img, Screenshot.makeImgOpts(uri, img, res))
      })
    }

    LOADED = false;

    /**
     * Constructs an instance of Screenshot.
     * @param {string} data - The data of the screenshot.
     */
    constructor(data) {
      this.data = data
      Screenshot.testURI(data).then(res => this.LOADED = res)
    }


    /**
     * The data of the screenshot.
     * @type {string}
     */
    data;
  }

  /**
   * Constructs a ScreenshotPayload object.
   * @param {string} data - The data of the screenshot.
   * @returns {object} An object containing the screenshot data and its type.
   */
  static ScreenshotPayload(data) {
    return SC_API.TypedData(new SC_API.Screenshot(data).data, "screenshot");
  }

  // ---

  /**
   * Handles Swisscows messages based on the response type.
   * @param {MessageEvent} response - The response object containing the data.
   * @param {Object} opts - The options for handling the response.
   * @param {Function} opts.tracker - Callback for handling tracker data.
   * @param {Function} opts.screenshot - Callback for handling screenshot data.
   * @param {Function} opts.error - Callback for handling errors.
   * @param {Function} opts.close - Callback for handling closure.
   */
  static handleSwssMSG(response, opts) {
    let { tracker, screenshot, error, close } = opts;
    let { type, data: payload } = response.data;

    function handle(cb) { return cb(payload, response) }
    switch (type) {
      case "tracker": return handle(tracker)
      case "screenshot": return handle(screenshot)
      case "error": return handle(error)
      case "close": return handle(close)
    }
  }
}
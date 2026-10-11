<div class="title-page pin-card-title">
  <h1>Pin reference</h1>
  <p class="subtitle">Proffieboard V3 (incl. 3.9) · ProffieOS</p>
  <hr class="rule" />
  <p class="purpose">Section <strong>A</strong>: names accepted in SD <strong>config/blades.ini</strong>. Section <strong>B</strong>: full board pin map from <strong>proffieboard_v3_config.h</strong> (buttons, I2C, audio, etc.). GPIO values are MCU indices for V3 only.</p>
  <p class="meta">Generated 2026-10-06 · SD tokens: 21 · SaberPins: 46</p>
</div>

<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section A — SD <code>blades.ini</code> tokens</h2>
  <p class="pin-card-section-lead">Use these spellings in <code>data_pin=</code>, <code>power_pin*=</code>, and simple-blade <code>pin*=</code> · <code>blade_config_pin_names.h</code></p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class="pin-row-sd"><td><code>blade2Pin</code></td><td>2</td><td>PA9 + PB4</td></tr>
<tr class="pin-row-sd"><td><code>blade3Pin</code></td><td>4</td><td>PA10 + PB5</td></tr>
<tr class="pin-row-sd"><td><code>blade4Pin</code></td><td>6</td><td>PA4</td></tr>
<tr class="pin-row-sd"><td><code>blade5Pin</code></td><td>7</td><td>Free1 PB3</td></tr>
<tr class="pin-row-sd"><td><code>blade6Pin</code></td><td>8</td><td>Free2 PB10</td></tr>
<tr class="pin-row-sd"><td><code>blade7Pin</code></td><td>9</td><td>Free3 PB11 + PC2</td></tr>
<tr class="pin-row-sd"><td><code>blade8Pin</code></td><td>16</td><td>also uart PC0</td></tr>
<tr class="pin-row-sd"><td><code>blade9Pin</code></td><td>17</td><td>also uart PC1</td></tr>
<tr class="pin-row-sd"><td><code>bladeIdentifyPin</code></td><td>1</td><td>blade identify input / FoC</td></tr>
<tr class="pin-row-sd"><td><code>bladePin</code></td><td>0</td><td>blade control, either WS2811 or PWM PA7+PA6</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin1</code></td><td>20</td><td>blade power control PA1</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin10</code></td><td>2</td><td>PA9</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin11</code></td><td>4</td><td>PA10</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin2</code></td><td>21</td><td>blade power control PB6</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin3</code></td><td>22</td><td>blade power control PC7</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin4</code></td><td>23</td><td>blade power control PB1</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin5</code></td><td>24</td><td>blade power control PC6</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin6</code></td><td>25</td><td>blade power control PB0</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin7</code></td><td>7</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin8</code></td><td>8</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
<tr class="pin-row-sd"><td><code>bladePowerPin9</code></td><td>9</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — I2C</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>i2cDataPin</code></td><td>18</td><td>I2C bus, Used by motion sensors  PB7</td></tr>
<tr class=""><td><code>i2cClockPin</code></td><td>19</td><td>I2C bus, Used by motion sensors   PB8</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Buttons</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>powerButtonPin</code></td><td>11</td><td>power button  PB14 + PC5</td></tr>
<tr class=""><td><code>auxPin</code></td><td>13</td><td>AUX button    PB13 + PA2</td></tr>
<tr class=""><td><code>aux2Pin</code></td><td>15</td><td>AUX2 button   PB15</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Memory card now uses SDIO</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>sdCardSelectPin</code></td><td>255</td><td>Memory card now uses SDIO</td></tr>
<tr class=""><td><code>amplifierPin</code></td><td>32</td><td>Amplifier enable pin PH1</td></tr>
<tr class=""><td><code>boosterPin</code></td><td>31</td><td>Booster enable pin   PH0</td></tr>
<tr class=""><td><code>motionSensorInterruptPin</code></td><td>30</td><td>motion sensor interrupt PC13</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — No fastled support yet</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>spiLedSelect</code></td><td>-1</td><td>No fastled support yet</td></tr>
<tr class=""><td><code>spiLedDataOut</code></td><td>-1</td><td>No fastled support yet</td></tr>
<tr class=""><td><code>spiLedClock</code></td><td>-1</td><td>No fastled support yet</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Neopixel pins</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>bladePin</code></td><td>0</td><td>blade control, either WS2811 or PWM PA7+PA6</td></tr>
<tr class=""><td><code>bladeIdentifyPin</code></td><td>1</td><td>blade identify input / FoC</td></tr>
<tr class=""><td><code>blade2Pin</code></td><td>2</td><td>PA9 + PB4</td></tr>
<tr class=""><td><code>blade3Pin</code></td><td>4</td><td>PA10 + PB5</td></tr>
<tr class=""><td><code>blade4Pin</code></td><td>6</td><td>PA4</td></tr>
<tr class=""><td><code>blade5Pin</code></td><td>7</td><td>Free1 PB3</td></tr>
<tr class=""><td><code>blade6Pin</code></td><td>8</td><td>Free2 PB10</td></tr>
<tr class=""><td><code>blade7Pin</code></td><td>9</td><td>Free3 PB11 + PC2</td></tr>
<tr class=""><td><code>blade8Pin</code></td><td>16</td><td>also uart PC0</td></tr>
<tr class=""><td><code>blade9Pin</code></td><td>17</td><td>also uart PC1</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Blade power control</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>bladePowerPin1</code></td><td>20</td><td>blade power control PA1</td></tr>
<tr class=""><td><code>bladePowerPin2</code></td><td>21</td><td>blade power control PB6</td></tr>
<tr class=""><td><code>bladePowerPin3</code></td><td>22</td><td>blade power control PC7</td></tr>
<tr class=""><td><code>bladePowerPin4</code></td><td>23</td><td>blade power control PB1</td></tr>
<tr class=""><td><code>bladePowerPin5</code></td><td>24</td><td>blade power control PC6</td></tr>
<tr class=""><td><code>bladePowerPin6</code></td><td>25</td><td>blade power control PB0</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — hook up an external FET to drive more powerful LEDs</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>bladePowerPin7</code></td><td>7</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
<tr class=""><td><code>bladePowerPin8</code></td><td>8</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
<tr class=""><td><code>bladePowerPin9</code></td><td>9</td><td>hook up an external FET to drive more powerful LEDs</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Status LED</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>statusLEDPin</code></td><td>26</td><td>Status LED</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — be possible at 800kHz.</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>bladePowerPin10</code></td><td>2</td><td>PA9</td></tr>
<tr class=""><td><code>bladePowerPin11</code></td><td>4</td><td>PA10</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — Analog pins</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>batteryLevelPin</code></td><td>29</td><td>battery level input PC4</td></tr>
<tr class=""><td><code>chargeDetectPin</code></td><td>27</td><td>PA0</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — UART</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>rxPin</code></td><td>16</td><td>PC0</td></tr>
<tr class=""><td><code>txPin</code></td><td>17</td><td>PC1</td></tr>
    </tbody>
  </table>
</section>
<section class="pin-card-section">
  <h2 class="pin-card-section-title">Section B — MiCOM setup</h2>
  <p class="pin-card-section-lead">Firmware <code>SaberPins</code> · Proffieboard V3</p>
  <table class="pin-table">
    <thead><tr><th>C name</th><th>GPIO</th><th>Role</th></tr></thead>
    <tbody>
<tr class=""><td><code>trigger1Pin</code></td><td>11</td><td>power button</td></tr>
<tr class=""><td><code>trigger2Pin</code></td><td>13</td><td>aux button</td></tr>
<tr class=""><td><code>trigger3Pin</code></td><td>15</td><td>aux2 button</td></tr>
<tr class=""><td><code>trigger4Pin</code></td><td>7</td><td>free1</td></tr>
<tr class=""><td><code>trigger5Pin</code></td><td>8</td><td>free2</td></tr>
<tr class=""><td><code>trigger6Pin</code></td><td>9</td><td>free3</td></tr>
<tr class=""><td><code>trigger7Pin</code></td><td>2</td><td>data2</td></tr>
<tr class=""><td><code>trigger8Pin</code></td><td>4</td><td>data3</td></tr>
    </tbody>
  </table>
</section>

<section class="pin-card-section pin-card-foot">
  <h2 class="pin-card-section-title">Bonded GPIO pairs (V3)</h2>
  <p class="pin-card-section-lead">Do not assign conflicting roles on the same bonded pair: (0,1) (2,3) (4,5) (9,10) (11,12) (13,14)</p>
</section>

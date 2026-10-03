#ifndef COMMON_BOOT_PROGRESS_H
#define COMMON_BOOT_PROGRESS_H

// Visible boot progress when USB serial is dead or not connected.
// Proffieboard v3: statusLEDPin (see proffieboard_v3_config.h). Short = 80 ms on/off.

inline void BootProgressPulse(int count) {
  if (count <= 0) return;
#ifdef statusLEDPin
  pinMode(statusLEDPin, OUTPUT);
  for (int i = 0; i < count; i++) {
    digitalWrite(statusLEDPin, HIGH);
    delay(80);
    digitalWrite(statusLEDPin, LOW);
    delay(80);
  }
#else
  (void)count;
#endif
}

#endif

#ifndef STYLES_CONFIG_PLAY_CUE_H
#define STYLES_CONFIG_PLAY_CUE_H

// One-shot cue from an event gate to the child layer it is about to run.
// Armed only for that runUpdate, then cleared. No RTTI: the child checks it.
// State lives in function-local statics so one firmware image shares one cue.

struct ConfigPlayCue {
  enum Action { NONE = 0, RESTART = 1, RELEASE = 2 };

  static void ArmRestart(int window_ms) {
    ActionSlot() = RESTART;
    WindowSlot() = window_ms;
  }

  static void ArmRelease() {
    ActionSlot() = RELEASE;
    WindowSlot() = 0;
  }

  static void Clear() {
    ActionSlot() = NONE;
    WindowSlot() = 0;
  }

  // True once when a restart is armed. window_ms may be null.
  // 0 means "no finite window" (a held lockup). >0 is the play length in ms.
  static bool ConsumeRestart(int* window_ms) {
    if (ActionSlot() != RESTART) return false;
    if (window_ms) *window_ms = WindowSlot();
    ActionSlot() = NONE;
    WindowSlot() = 0;
    return true;
  }

  static bool ConsumeRelease() {
    if (ActionSlot() != RELEASE) return false;
    ActionSlot() = NONE;
    WindowSlot() = 0;
    return true;
  }

 private:
  static Action& ActionSlot() {
    static Action action = NONE;
    return action;
  }
  static int& WindowSlot() {
    static int window_ms = 0;
    return window_ms;
  }
};

#endif  // STYLES_CONFIG_PLAY_CUE_H

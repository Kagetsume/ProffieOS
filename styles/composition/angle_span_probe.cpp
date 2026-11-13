// Host probe for angle_span. Not part of the firmware image.
//   g++ -O -g -std=c++14 -o /tmp/angle_span_probe styles/composition/angle_span_probe.cpp -lm
//   /tmp/angle_span_probe
// Run from the repository root.
//
// event_lockup -1 is a hold: EventGateStyle::UpdateHold calls Begin(blade, 0)
// when the duration is below 1. A 0 ms window does not fit the frames to a wav,
// so AdvanceAnimation loops at fps for the whole hold.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <cmath>
#include <vector>
#include <sys/stat.h>
#include <unistd.h>

#define interrupts() do {} while (0)
#define noInterrupts() do {} while (0)
#define SCOPED_PROFILER() do {} while (0)
#define NUM_BLADES 3
#define PROFFIE_TEST
#define ENABLE_SD
#define COMMON_FUSE_H
#define HEX 16
#define StyleAllocator class StyleFactory*

template<class T, class U>
struct is_same_type { static const bool value = false; };
template<class T>
struct is_same_type<T, T> { static const bool value = true; };

struct V3 {
  V3(float v) { x = y = z = v; }
  float x, y, z;
};

struct MockFuse {
  float angle1_ = 0.0f;
  float angle1() { return angle1_; }
  float angle2() { return 0.0f; }
  float swing_speed() { return 0.0f; }
  float swing_accel() { return 0.0f; }
  float twist_accel() { return 0.0f; }
  V3 gyro() { return V3(0.0f); }
};
MockFuse fusor;

struct MockDynamicMixer {
  int32_t last_sample() const { return 0; }
  int32_t last_sum() const { return 0; }
  int32_t audio_volume() const { return 0; }
};
MockDynamicMixer dynamic_mixer;

template<class A, class B>
constexpr auto min(A&& a, B&& b) -> decltype(a < b ? std::forward<A>(a) : std::forward<B>(b)) {
  return a < b ? std::forward<A>(a) : std::forward<B>(b);
}
template<class A, class B>
constexpr auto max(A&& a, B&& b) -> decltype(a < b ? std::forward<A>(a) : std::forward<B>(b)) {
  return a >= b ? std::forward<A>(a) : std::forward<B>(b);
}

char* itoa(int value, char* str, int radix) {
  if (radix != 10) {
    fprintf(stderr, "Unexpected radix\n");
    exit(1);
  }
  sprintf(str, "%d", value);
  return str;
}

uint32_t micros_ = 1000000;
uint32_t micros() { return micros_; }
uint32_t millis() { return micros_ / 1000; }
int random(int x) { return 0; }

#include "../../common/common.h"
#include "../../common/math.h"
#include "../../common/stdout.h"

Print default_printer;
Print* default_output = &default_printer;
Print* stdout_output = &default_printer;
ConsoleHelper STDOUT;
Monitoring monitor;

#include "../../common/color.h"
#include "../../common/loop_counter.h"
#include "../../common/scoped_cycle_counter.h"
#include "../../common/linked_list.h"

uint64_t loop_cycles = 0;

#include "../../common/looper.h"
#include "../../common/range.h"
#include "../../blades/blade_base.h"
#include "../style_ptr.h"
#include "../../common/arg_parser.h"
#include "../../functions/int.h"
#include "../../functions/bump.h"
#include "../../transitions/base.h"
#include "../../transitions/join.h"

// PROFFIE_TEST LSFS can fopen, and it has no IsMounted(). Inject that method
// while the class is parsed, then use the real typedef below.
#define LSFILE LSFILE; static bool IsMounted() { return true; } typedef File UnusedLSFILE
#include "../../common/lsfs.h"
#undef LSFILE
#include "angle_span.h"

ArgParserInterface* CurrentArgParser = nullptr;
SaberBase* saberbases = nullptr;
SaberBase::LockupType SaberBase::lockup_ = SaberBase::LOCKUP_NONE;
SaberBase::ColorChangeMode SaberBase::color_change_mode_ = SaberBase::COLOR_CHANGE_MODE_NONE;
uint32_t SaberBase::last_motion_request_ = 0;
uint32_t SaberBase::current_variation_ = 0;
float SaberBase::sound_length = 0.0f;
int SaberBase::sound_number = -1;
float SaberBase::clash_strength_ = 0.0f;

static int g_fails = 0;

#define CHECK(cond)                                                            \
  do {                                                                         \
    if (!(cond)) {                                                             \
      fprintf(stderr, "FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);         \
      g_fails++;                                                               \
    }                                                                          \
  } while (0)

class MockBlade : public BladeBase {
 public:
  std::vector<Color16> colors;
  int num_leds() const override { return (int)colors.size(); }
  bool is_powered() const override { return true; }
  void set(int led, Color16 c) override { colors[led] = c; }
  void set_overdrive(int led, Color16 c) override { (void)led; (void)c; }
  void allow_disable() override {}
  void Activate(int blade_number) override { (void)blade_number; }
  void Deactivate() override {}
  Color8::Byteorder get_byteorder() const override { return Color8::RGB; }
  int GetBladeNumber() const override { return 1; }
  void SetStyle(BladeStyle* style) override { current_style_ = style; }
  BladeStyle* UnSetStyle() override {
    BladeStyle* ret = current_style_;
    current_style_ = nullptr;
    return ret;
  }
  BladeStyle* current_style() const override { return current_style_; }

 private:
  BladeStyle* current_style_ = nullptr;
};

static void PutU16(uint8_t* p, uint16_t v) {
  p[0] = (uint8_t)v;
  p[1] = (uint8_t)(v >> 8);
}
static void PutU32(uint8_t* p, uint32_t v) {
  p[0] = (uint8_t)v;
  p[1] = (uint8_t)(v >> 8);
  p[2] = (uint8_t)(v >> 16);
  p[3] = (uint8_t)(v >> 24);
}

static void SetAngleDown() { fusor.angle1_ = (float)(-M_PI / 2.0); }
static void SetAngleUp() { fusor.angle1_ = (float)(M_PI / 2.0); }
static void SetAngleHorizon() { fusor.angle1_ = 0.0f; }

// Straight down is BladeAngle 0 (hilt). Straight up is 32768 (tip).
static void TestAngleEnds() {
  MockBlade blade;
  blade.colors.resize(100);
  SetAngleDown();
  int down = AngleSpanReadPosition(&blade);
  CHECK(down == 0);
  CHECK(StripSpanCenterLed(100, down) == 0);

  SetAngleUp();
  int up = AngleSpanReadPosition(&blade);
  CHECK(up == 32768);
  CHECK(StripSpanCenterLed(100, up) == 100);

  SetAngleHorizon();
  int mid = AngleSpanReadPosition(&blade);
  CHECK(mid > down && mid < up);
  int mid_led = StripSpanCenterLed(100, mid);
  CHECK(mid_led > 0 && mid_led < 100);
}

static bool WriteFile(const char* path, const uint8_t* data, size_t n) {
  FILE* f = fopen(path, "wb");
  if (!f) return false;
  size_t w = fwrite(data, 1, n, f);
  fclose(f);
  return w == n;
}

// Top-down 24-bit BMP. frames rows, width pixels, each row a flat BGR color.
static bool WriteFramesBmp(const char* path, int width, int frames, const uint8_t* bgr) {
  int stride = ((width * 3 + 3) / 4) * 4;
  int nbytes = 54 + frames * stride;
  std::vector<uint8_t> b(nbytes, 0);
  b[0] = 'B';
  b[1] = 'M';
  PutU32(&b[2], (uint32_t)nbytes);
  PutU32(&b[10], 54);
  PutU32(&b[14], 40);
  PutU32(&b[18], (uint32_t)width);
  PutU32(&b[22], (uint32_t)(-frames));  // top-down: row 0 is frame 0
  PutU16(&b[26], 1);
  PutU16(&b[28], 24);
  for (int frame = 0; frame < frames; frame++) {
    uint8_t* row = &b[54 + frame * stride];
    for (int x = 0; x < width; x++) {
      row[x * 3 + 0] = bgr[frame * 3 + 0];
      row[x * 3 + 1] = bgr[frame * 3 + 1];
      row[x * 3 + 2] = bgr[frame * 3 + 2];
    }
  }
  return WriteFile(path, b.data(), b.size());
}

static bool WriteTga(const char* path, int width, const uint8_t* bgra) {
  int nbytes = 18 + width * 4;
  std::vector<uint8_t> t(nbytes, 0);
  t[2] = 2;
  PutU16(&t[12], (uint16_t)width);
  PutU16(&t[14], 1);
  t[16] = 32;
  t[17] = 0x28;  // top-down, 8-bit alpha
  memcpy(&t[18], bgra, (size_t)width * 4);
  return WriteFile(path, t.data(), t.size());
}

static int FirstLit(BladeStyle* style, int n) {
  for (int i = 0; i < n; i++) {
    if (style->getLayerColor(i).alpha) return i;
  }
  return -1;
}

static int LastLit(BladeStyle* style, int n) {
  for (int i = n - 1; i >= 0; i--) {
    if (style->getLayerColor(i).alpha) return i;
  }
  return -1;
}

// Window that StripSpanCenterLed would draw for this position and span.
static void ExpectWindow(BladeStyle* style, int leds, int span, int pos) {
  int center = StripSpanCenterLed(leds, pos);
  int start = center - span / 2;
  int first = start < 0 ? 0 : start;
  int last = start + span - 1;
  if (last >= leds) last = leds - 1;
  CHECK(FirstLit(style, leds) == first);
  CHECK(LastLit(style, leds) == last);
  if (first > 0) CHECK(style->getLayerColor(first - 1).alpha == 0);
  if (last + 1 < leds) CHECK(style->getLayerColor(last + 1).alpha == 0);
  CHECK(style->getLayerColor(first).alpha == 32768);
}

static BladeStyle* MakeAngle(const char* args) {
  ArgParser ap(args);
  CurrentArgParser = &ap;
  BladeStyle* style = StylePtr<AngleSpanL<IntArg<2, 36>, IntArg<3, 24>>>()->make();
  CurrentArgParser = nullptr;
  return style;
}

static void HoldLockup() {
  SaberBase::SetLockup(SaberBase::LOCKUP_NORMAL);
}

static void ClearLockup() {
  SaberBase::SetLockup(SaberBase::LOCKUP_NONE);
}

static void TestWindowFollowsAngle() {
  const char* path = "tmp/angle_span_white.bmp";
  const uint8_t white[3] = {255, 255, 255};
  CHECK(WriteFramesBmp(path, 4, 1, white));

  const int leds = 100;
  const int span = 10;
  MockBlade blade;
  blade.colors.resize(leds);
  char args[160];
  snprintf(args, sizeof(args), "%s %d 24", path, span);
  BladeStyle* child = MakeAngle(args);
  CHECK(child != nullptr);
  EventGateStyle gate(child, ConfigEventKind::LOCKUP, -1);

  // Idle: the hold is not on, so the picture is transparent.
  ClearLockup();
  SetAngleDown();
  gate.run(&blade);
  CHECK(gate.getLayerColor(0).alpha == 0);
  CHECK(gate.getLayerColor(50).alpha == 0);

  HoldLockup();
  SetAngleDown();
  gate.run(&blade);
  int down = AngleSpanReadPosition(&blade);
  CHECK(down == 0);
  ExpectWindow(&gate, leds, span, down);
  CHECK(FirstLit(&gate, leds) == 0);

  // A blast sitting elsewhere must not move this window.
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_BLAST, EffectLocation(0.25f));
  SetAngleUp();
  gate.run(&blade);
  int up = AngleSpanReadPosition(&blade);
  CHECK(up == 32768);
  ExpectWindow(&gate, leds, span, up);
  CHECK(LastLit(&gate, leds) == leds - 1);
  CHECK(gate.getLayerColor(25).alpha == 0);

  // Mid change slides the window off both ends.
  SetAngleHorizon();
  gate.run(&blade);
  int mid = AngleSpanReadPosition(&blade);
  int mid_led = StripSpanCenterLed(leds, mid);
  CHECK(mid_led > 10 && mid_led < 90);
  ExpectWindow(&gate, leds, span, mid);
  CHECK(FirstLit(&gate, leds) != 0);
  CHECK(LastLit(&gate, leds) != leds - 1);

  ClearLockup();
  gate.run(&blade);
  CHECK(gate.getLayerColor(mid_led).alpha == 0);
}

static std::vector<uint16_t> FrameColors(BladeStyle* style, MockBlade* blade, int steps, int step_us) {
  std::vector<uint16_t> seq;
  for (int i = 0; i < steps; i++) {
    style->run(blade);
    RGBA_um c = style->getLayerColor(0);
    if (c.alpha && (seq.empty() || seq.back() != c.c.r)) seq.push_back(c.c.r);
    micros_ += (uint32_t)step_us;
  }
  return seq;
}

static bool SawWrap(const std::vector<uint16_t>& seq) {
  if (seq.size() < 2) return false;
  uint16_t first = seq[0];
  bool left = false;
  for (size_t i = 1; i < seq.size(); i++) {
    if (seq[i] != first) left = true;
    if (left && seq[i] == first) return true;
  }
  return false;
}

static void TestLoopsWhileHeld() {
  const char* path = "tmp/angle_span_frames.bmp";
  // Four frames, flat red 10 / 20 / 30 / 40. sqr() makes them 100 / 400 / 900 / 1600.
  const uint8_t bgr[12] = {
      0, 0, 10, 0, 0, 20, 0, 0, 30, 0, 0, 40,
  };
  CHECK(WriteFramesBmp(path, 4, 4, bgr));

  MockBlade blade;
  blade.colors.resize(40);
  char args[160];
  snprintf(args, sizeof(args), "%s 10 10", path);
  BladeStyle* child = MakeAngle(args);
  EventGateStyle gate(child, ConfigEventKind::LOCKUP, -1);
  HoldLockup();
  SetAngleDown();
  // 10 fps → 100 ms per frame. 30 steps is several passes of a 4-frame file.
  std::vector<uint16_t> seq = FrameColors(&gate, &blade, 30, 100000);
  CHECK(seq.size() >= 4);
  CHECK(!seq.empty() && seq[0] == (uint16_t)(10 * 10));
  CHECK(SawWrap(seq));

  // A positive duration fits the rows across that window and holds the last row.
  ClearLockup();
  micros_ += 1000;
  BladeStyle* once_child = MakeAngle(args);
  EventGateStyle once(once_child, ConfigEventKind::LOCKUP, 400);
  HoldLockup();
  SetAngleDown();
  std::vector<uint16_t> held = FrameColors(&once, &blade, 30, 100000);
  CHECK(held.size() >= 2);
  CHECK(!SawWrap(held));
  CHECK(!held.empty() && held.back() == (uint16_t)(40 * 40));
  ClearLockup();
}

static void TestTgaAlphaAndOutside() {
  const char* path = "tmp/angle_span_alpha.tga";
  // Four BGRA pixels. The hilt window (span 4, center 0) shows locals 2 and 3
  // on LEDs 0 and 1: alpha 0 and alpha 128. LED 2 is outside the window.
  const uint8_t px[16] = {
      0, 0, 255, 255, 0, 255, 0, 255, 0, 0, 255, 0, 0, 0, 255, 128,
  };
  CHECK(WriteTga(path, 4, px));

  MockBlade blade;
  blade.colors.resize(8);
  char args[160];
  snprintf(args, sizeof(args), "%s 4 24", path);
  BladeStyle* child = MakeAngle(args);
  EventGateStyle gate(child, ConfigEventKind::LOCKUP, -1);
  HoldLockup();
  SetAngleDown();
  gate.run(&blade);
  CHECK(AngleSpanReadPosition(&blade) == 0);
  CHECK(gate.getLayerColor(0).alpha == 0);
  CHECK(gate.getLayerColor(1).alpha == (uint16_t)((128u * 32768u) / 255u));
  CHECK(gate.getLayerColor(1).c.r == (uint16_t)(255u * 255u));
  CHECK(gate.getLayerColor(2).alpha == 0);
  CHECK(gate.getLayerColor(7).alpha == 0);
  ClearLockup();
}

static void TestStripSpanIgnoresAngle() {
  const char* path = "tmp/angle_span_white.bmp";
  MockBlade blade;
  blade.colors.resize(100);
  char args[160];
  snprintf(args, sizeof(args), "%s 10 24", path);
  ArgParser ap(args);
  CurrentArgParser = &ap;
  BladeStyle* child = StylePtr<StripSpanL<IntArg<2, 36>, IntArg<3, 24>>>()->make();
  CurrentArgParser = nullptr;
  EventGateStyle gate(child, ConfigEventKind::BLAST, -1);

  micros_ += 8000000;  // drop older effects
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_BLAST, EffectLocation(0.25f));
  // -1 on a one-shot uses the wav length. Give this blast a one-second wav.
  BladeEffect* effects = nullptr;
  CHECK(SaberBase::GetEffects(&effects) > 0);
  effects[0].sound_length = 1.0f;
  SetAngleUp();
  gate.run(&blade);

  int pos = -1;
  CHECK(StripSpanReadEffectPosition(&blade, EFFECT_BLAST, &pos));
  CHECK(pos == 8192);
  ExpectWindow(&gate, 100, 10, pos);
  // Tip angle would light the last LEDs. The blast window stays on the hit.
  CHECK(gate.getLayerColor(99).alpha == 0);
  CHECK(gate.getLayerColor(25).alpha == 32768);
}

static void TestRejects() {
  ArgParser wide("tmp/nope.bmp 193 24");
  CurrentArgParser = &wide;
  AngleSpanL<IntArg<2, 36>, IntArg<3, 24>> rejected;
  MockBlade blade;
  blade.colors.resize(40);
  ConfigEventGateCue::Set(ConfigEventKind::LOCKUP);
  SetAngleHorizon();
  rejected.run(&blade);
  ConfigEventGateCue::Clear();
  CHECK(rejected.getColor(10).alpha == 0);

  ArgParser fx("tmp/lockup-hit.tga 47 30 frames_x");
  CurrentArgParser = &fx;
  BladeStyle* made = angle_span_factory.make();
  CHECK(made != nullptr);
  delete made;
  CurrentArgParser = nullptr;

  // The factory captured 47 / 30 from the line, and the path.
  ArgParser line("tmp/lockup-hit.tga 47 30");
  CurrentArgParser = &line;
  AngleSpanL<IntArg<2, 36>, IntArg<3, 24>> sized;
  CHECK(!strcmp(sized.captured_path(), "tmp/lockup-hit.tga"));
  CurrentArgParser = nullptr;
}

int main() {
  setvbuf(stdout, nullptr, _IONBF, 0);
  mkdir("tmp", 0755);
  TestAngleEnds();
  TestWindowFollowsAngle();
  TestLoopsWhileHeld();
  TestTgaAlphaAndOutside();
  TestStripSpanIgnoresAngle();
  TestRejects();
  remove("tmp/angle_span_white.bmp");
  remove("tmp/angle_span_frames.bmp");
  remove("tmp/angle_span_alpha.tga");
  rmdir("tmp");
  if (g_fails) {
    fprintf(stderr, "%d check(s) failed\n", g_fails);
    return 1;
  }
  printf("angle_span probe ok\n");
  return 0;
}

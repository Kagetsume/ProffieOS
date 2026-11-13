// Host probe for strip_span. Not part of the firmware image.
//   g++ -O -g -std=c++14 -o /tmp/strip_span_probe styles/composition/strip_span_probe.cpp -lm
//   /tmp/strip_span_probe
// Run from the repository root.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <cmath>
#include <vector>

#define interrupts() do {} while (0)
#define noInterrupts() do {} while (0)
#define SCOPED_PROFILER() do {} while (0)
#define NUM_BLADES 3
#define PROFFIE_TEST
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
  float angle1() { return 0.0f; }
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
#include "strip_span.h"

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

static void WriteBmpHeader(uint8_t* b, int32_t width, int32_t height, uint32_t compression) {
  memset(b, 0, 54);
  b[0] = 'B';
  b[1] = 'M';
  PutU32(b + 2, 54);
  PutU32(b + 10, 54);
  PutU32(b + 14, 40);
  PutU32(b + 18, (uint32_t)width);
  PutU32(b + 22, (uint32_t)height);
  PutU16(b + 26, 1);
  PutU16(b + 28, 24);
  PutU32(b + 30, compression);
}

static void ExpireEffects() {
  micros_ += 8000000;
  BladeEffect* effects = nullptr;
  SaberBase::GetEffects(&effects);
}

static void TestWindow() {
  const int leds = 100;
  const int span = 10;
  // pos 16384 is the middle. center = 50. Window is LEDs 45..54.
  CHECK(StripSpanCenterLed(leds, 16384) == 50);
  int local = -1;
  CHECK(StripSpanLedLocal(45, leds, span, 16384, &local) && local == 0);
  CHECK(StripSpanLedLocal(54, leds, span, 16384, &local) && local == 9);
  CHECK(!StripSpanLedLocal(44, leds, span, 16384, &local));
  CHECK(!StripSpanLedLocal(55, leds, span, 16384, &local));

  // Hilt. center 0, start -5. LEDs 0..4 are the upper half of the span.
  CHECK(StripSpanCenterLed(leds, 0) == 0);
  CHECK(StripSpanLedLocal(0, leds, span, 0, &local) && local == 5);
  CHECK(StripSpanLedLocal(4, leds, span, 0, &local) && local == 9);
  CHECK(!StripSpanLedLocal(5, leds, span, 0, &local));

  // Tip. 32768 maps to LED num_leds. start = 95. LEDs 95..99 stay, 100 is not a LED.
  CHECK(StripSpanCenterLed(leds, 32768) == 100);
  CHECK(!StripSpanLedLocal(94, leds, span, 32768, &local));
  CHECK(StripSpanLedLocal(95, leds, span, 32768, &local) && local == 0);
  CHECK(StripSpanLedLocal(99, leds, span, 32768, &local) && local == 4);
  CHECK(!StripSpanLedLocal(100, leds, span, 32768, &local));

  CHECK(StripSpanSpanIgnored(193));
  CHECK(StripSpanSpanIgnored(0));
  CHECK(!StripSpanSpanIgnored(36));
  CHECK(!StripSpanSpanIgnored(192));
}

static void TestAlpha() {
  // Four pixels. Alphas 255, 0, 128, 64. Span covers LEDs 2..5 on an 8-LED blade.
  uint8_t row[16] = {
      10, 0, 0, 255, 0, 20, 0, 0, 0, 0, 30, 128, 0, 40, 0, 64,
  };
  const int leds = 8;
  const int span = 4;
  const int pos = 16384;  // center 4, start 2
  CHECK(StripSpanCenterLed(leds, pos) == 4);
  CHECK(StripSpanLedAlpha(false, row, 4, 2, leds, span, pos) == 0);
  CHECK(StripSpanLedAlpha(true, row, 4, 1, leds, span, pos) == 0);
  CHECK(StripSpanLedAlpha(true, row, 4, 6, leds, span, pos) == 0);
  CHECK(StripSpanLedAlpha(true, row, 4, 2, leds, span, pos) == 32768);
  CHECK(StripSpanLedAlpha(true, row, 4, 3, leds, span, pos) == 0);
  CHECK(StripSpanLedAlpha(true, row, 4, 4, leds, span, pos) == (uint16_t)((128u * 32768u) / 255u));
  CHECK(StripSpanLedAlpha(true, row, 4, 5, leds, span, pos) == (uint16_t)((64u * 32768u) / 255u));
  CHECK(StripSpanLedAlpha(true, row, 4, 2, leds, 193, pos) == 0);

  // At the hilt the window is centered on LED 0, so the first half is clipped.
  // LED 0 samples the pixel that belongs there (local 2, alpha 128), not pixel 0.
  CHECK(StripSpanLedAlpha(true, row, 4, 2, leds, span, 0) == 0);
  CHECK(StripSpanLedAlpha(true, row, 4, 0, leds, span, 0) == (uint16_t)((128u * 32768u) / 255u));
  CHECK(StripSpanLedAlpha(true, row, 4, 1, leds, span, 0) == (uint16_t)((64u * 32768u) / 255u));
}

static void TestHeaders() {
  uint8_t bmp[62];
  WriteBmpHeader(bmp, 2, 1, 0);
  // BGR red, BGR green, pad.
  bmp[54] = 0;
  bmp[55] = 0;
  bmp[56] = 255;
  bmp[57] = 0;
  bmp[58] = 255;
  bmp[59] = 0;
  FileReader bf;
  bf.OpenMem(bmp, sizeof(bmp));
  StripColumnImageInfo info;
  CHECK(StripColumnReadImageHeader(&bf, &info) == STRIP_COLUMN_IMAGE_OK);
  CHECK(info.kind == STRIP_COLUMN_IMAGE_BMP);
  uint8_t row[16];
  CHECK(StripColumnLoadFrameRow(&bf, &info, 0, 2, row, sizeof(row)));
  CHECK(row[0] == 255 && row[3] == 255);
  CHECK(row[4] == 0 && row[5] == 255 && row[7] == 255);

  uint8_t bad[54];
  WriteBmpHeader(bad, 2, 1, 1);
  FileReader badf;
  badf.OpenMem(bad, sizeof(bad));
  CHECK(StripColumnReadImageHeader(&badf, &info) == STRIP_COLUMN_IMAGE_BAD);

  uint8_t wide[54];
  WriteBmpHeader(wide, 193, 1, 0);
  FileReader widef;
  widef.OpenMem(wide, sizeof(wide));
  CHECK(StripColumnReadImageHeader(&widef, &info) == STRIP_COLUMN_IMAGE_TOO_LONG);

  uint8_t tga[18 + 8];
  memset(tga, 0, sizeof(tga));
  tga[2] = 2;
  PutU16(tga + 12, 2);
  PutU16(tga + 14, 1);
  tga[16] = 32;
  tga[17] = 0x28;  // top-down, 8-bit alpha
  // BGRA transparent red, BGRA green at alpha 128.
  tga[18] = 0;
  tga[19] = 0;
  tga[20] = 255;
  tga[21] = 0;
  tga[22] = 0;
  tga[23] = 255;
  tga[24] = 0;
  tga[25] = 128;
  FileReader tf;
  tf.OpenMem(tga, sizeof(tga));
  CHECK(StripColumnReadImageHeader(&tf, &info) == STRIP_COLUMN_IMAGE_OK);
  CHECK(info.kind == STRIP_COLUMN_IMAGE_TGA);
  CHECK(StripColumnLoadFrameRow(&tf, &info, 0, 2, row, sizeof(row)));
  CHECK(row[0] == 255 && row[1] == 0 && row[2] == 0 && row[3] == 0);
  CHECK(row[4] == 0 && row[5] == 255 && row[6] == 0 && row[7] == 128);

  uint8_t rle[18];
  memset(rle, 0, sizeof(rle));
  rle[2] = 10;
  PutU16(rle + 12, 2);
  PutU16(rle + 14, 1);
  rle[16] = 32;
  rle[17] = 8;
  FileReader rf;
  rf.OpenMem(rle, sizeof(rle));
  CHECK(StripColumnReadImageHeader(&rf, &info) == STRIP_COLUMN_IMAGE_BAD);

  uint8_t rtl[18];
  memset(rtl, 0, sizeof(rtl));
  rtl[2] = 2;
  PutU16(rtl + 12, 2);
  PutU16(rtl + 14, 1);
  rtl[16] = 32;
  rtl[17] = 0x18;  // right-to-left plus alpha
  FileReader lf;
  lf.OpenMem(rtl, sizeof(rtl));
  CHECK(StripColumnReadImageHeader(&lf, &info) == STRIP_COLUMN_IMAGE_BAD);
}

static void TestLocations() {
  ExpireEffects();
  MockBlade blade;
  blade.colors.resize(100);
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_BLAST, EffectLocation(0.5f));
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_CLASH, EffectLocation(0.25f));
  int pos = -1;
  CHECK(StripSpanReadEffectPosition(&blade, EFFECT_BLAST, &pos));
  CHECK(pos == 16384);
  CHECK(StripSpanReadEffectPosition(&blade, EFFECT_CLASH, &pos));
  CHECK(pos == 8192);

  // A later blast replaces the blast location. The clash location stays.
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_BLAST, EffectLocation(0.75f));
  CHECK(StripSpanReadEffectPosition(&blade, EFFECT_BLAST, &pos));
  CHECK(pos == 24576);
  CHECK(StripSpanCenterLed(100, pos) == 75);
  CHECK(StripSpanReadEffectPosition(&blade, EFFECT_CLASH, &pos));
  CHECK(pos == 8192);
}

static void TestPathsAndIdle() {
  ArgParser a("animations/first.tga 36 24");
  CurrentArgParser = &a;
  StripSpanL<IntArg<2, 36>, IntArg<3, 24>> first;
  ArgParser b("animations/second.tga 20 12");
  CurrentArgParser = &b;
  StripSpanL<IntArg<2, 36>, IntArg<3, 24>> second;
  CHECK(!strcmp(first.captured_path(), "animations/first.tga"));
  CHECK(!strcmp(second.captured_path(), "animations/second.tga"));

  StripColumnPendingPath::Set("animations/stolen.tga");
  MockBlade blade;
  blade.colors.resize(40);
  ConfigEventGateCue::Set(ConfigEventKind::BLAST);
  ExpireEffects();
  micros_ += 1000;
  SaberBase::DoEffect(EFFECT_BLAST, EffectLocation(0.5f));
  first.run(&blade);
  second.run(&blade);
  ConfigEventGateCue::Clear();
  CHECK(!strcmp(first.captured_path(), "animations/first.tga"));
  CHECK(!strcmp(second.captured_path(), "animations/second.tga"));

  // No gate, no hit: the layer contributes alpha 0.
  CurrentArgParser = &a;
  StripSpanL<IntArg<2, 36>, IntArg<3, 24>> idle;
  idle.run(&blade);
  CHECK(idle.getColor(0).alpha == 0);
  CHECK(idle.getColor(20).alpha == 0);

  // Span over 192 is ignored. getColor stays transparent even during a blast.
  ArgParser wide("animations/wide.tga 193 24");
  CurrentArgParser = &wide;
  StripSpanL<IntArg<2, 36>, IntArg<3, 24>> rejected;
  ConfigEventGateCue::Set(ConfigEventKind::BLAST);
  rejected.run(&blade);
  ConfigEventGateCue::Clear();
  CHECK(rejected.getColor(10).alpha == 0);
  CHECK(!strcmp(rejected.captured_path(), "animations/wide.tga"));

  ArgParser fx("animations/clash-hit.tga 36 24 frames_x");
  CurrentArgParser = &fx;
  BladeStyle* made = strip_span_factory.make();
  CHECK(made != nullptr);
  delete made;
  CurrentArgParser = nullptr;
}

int main() {
  TestWindow();
  TestAlpha();
  TestHeaders();
  TestLocations();
  TestPathsAndIdle();
  if (g_fails) {
    fprintf(stderr, "%d check(s) failed\n", g_fails);
    return 1;
  }
  printf("strip_span probe ok\n");
  return 0;
}

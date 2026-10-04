#ifndef FUNCTIONS_INT_ARG_H
#define FUNCTIONS_INT_ARG_H

#include "../common/arg_parser.h"
#include "../common/opacity_scale.h"
#include "svf.h"

class IntArgBase {
public:
  FunctionRunResult run(BladeBase* base) {
    switch (value_) {
      case 0: return FunctionRunResult::ZERO_UNTIL_IGNITION;
      case 32768: return FunctionRunResult::ONE_UNTIL_IGNITION;
      default: return FunctionRunResult::UNKNOWN;
    }
  }
  int getInteger(int led) { return value_; }
  int calculate(BladeBase* blade) { return value_; }
protected:
  void init(int argnum) {
    char default_value[16];
    itoa(value_, default_value, 10);
    if (!CurrentArgParser) return;
    const char* arg = CurrentArgParser->GetArg(argnum, "INT", default_value);
    if (arg && arg[0]) {
      value_ = strtol(arg, NULL, 0);
    }
  }
  
  int value_;
};

template<int ARG, int DEFAULT_VALUE>
class IntArgSVF : public IntArgBase {
public:
  IntArgSVF() {
    value_ = DEFAULT_VALUE;
    init(ARG);
  }
};

// Optimized specialization
template<int ARG, int DEFAULT_VALUE>
class SingleValueAdapter<IntArgSVF<ARG, DEFAULT_VALUE>> : public IntArgSVF<ARG, DEFAULT_VALUE> {};
template<int ARG, int DEFAULT_VALUE>
class SVFWrapper<IntArgSVF<ARG, DEFAULT_VALUE>> : public IntArgSVF<ARG, DEFAULT_VALUE> {};

template<int ARG, int DEFAULT_VALUE>
using IntArg = SingleValueAdapter<IntArgSVF<ARG, DEFAULT_VALUE>>;

// 0–32768 brightness/opacity tokens (percent, raw, or implicit percent when n <= 100).
class OpacityScaleIntArgBase {
public:
  FunctionRunResult run(BladeBase* base) {
    switch (value_) {
      case 0: return FunctionRunResult::ZERO_UNTIL_IGNITION;
      case 32768: return FunctionRunResult::ONE_UNTIL_IGNITION;
      default: return FunctionRunResult::UNKNOWN;
    }
  }
  int getInteger(int led) { return value_; }
  int calculate(BladeBase* blade) { return value_; }
protected:
  void init(int argnum) {
    char default_value[16];
    itoa(value_, default_value, 10);
    if (!CurrentArgParser) return;
    const char* arg = CurrentArgParser->GetArg(argnum, "INT", default_value);
    if (arg && arg[0] && OpacityScaleTokenParses(arg)) {
      value_ = ParseOpacityScaleToken(arg);
    }
  }

  int value_;
};

template<int ARG, int DEFAULT_VALUE>
class OpacityScaleIntArgSVF : public OpacityScaleIntArgBase {
public:
  OpacityScaleIntArgSVF() {
    value_ = DEFAULT_VALUE;
    init(ARG);
  }
};

template<int ARG, int DEFAULT_VALUE>
class SingleValueAdapter<OpacityScaleIntArgSVF<ARG, DEFAULT_VALUE>>
    : public OpacityScaleIntArgSVF<ARG, DEFAULT_VALUE> {};
template<int ARG, int DEFAULT_VALUE>
class SVFWrapper<OpacityScaleIntArgSVF<ARG, DEFAULT_VALUE>>
    : public OpacityScaleIntArgSVF<ARG, DEFAULT_VALUE> {};

template<int ARG, int DEFAULT_VALUE>
using OpacityScaleIntArg = SingleValueAdapter<OpacityScaleIntArgSVF<ARG, DEFAULT_VALUE>>;

// 0–32768 blade position (hilt→tip): 0%, 49%, 100%, or legacy raw >100 (e.g. 16000).
template<int ARG, int DEFAULT_VALUE>
using BladePositionIntArg = OpacityScaleIntArg<ARG, DEFAULT_VALUE>;

// 0–65535 multiply-mask brightness (percent, raw, or implicit percent when n <= 100).
class Brightness65535ScaleIntArgBase {
public:
  FunctionRunResult run(BladeBase* base) {
    switch (value_) {
      case 0: return FunctionRunResult::ZERO_UNTIL_IGNITION;
      case 65535: return FunctionRunResult::ONE_UNTIL_IGNITION;
      default: return FunctionRunResult::UNKNOWN;
    }
  }
  int getInteger(int led) { return value_; }
  int calculate(BladeBase* blade) { return value_; }
protected:
  void init(int argnum) {
    char default_value[16];
    itoa(value_, default_value, 10);
    if (!CurrentArgParser) return;
    const char* arg = CurrentArgParser->GetArg(argnum, "INT", default_value);
    if (arg && arg[0] && OpacityScaleTokenParses(arg)) {
      value_ = ParseBrightness65535Token(arg);
    }
  }

  int value_;
};

template<int ARG, int DEFAULT_VALUE>
class Brightness65535ScaleIntArgSVF : public Brightness65535ScaleIntArgBase {
public:
  Brightness65535ScaleIntArgSVF() {
    value_ = DEFAULT_VALUE;
    init(ARG);
  }
};

template<int ARG, int DEFAULT_VALUE>
class SingleValueAdapter<Brightness65535ScaleIntArgSVF<ARG, DEFAULT_VALUE>>
    : public Brightness65535ScaleIntArgSVF<ARG, DEFAULT_VALUE> {};
template<int ARG, int DEFAULT_VALUE>
class SVFWrapper<Brightness65535ScaleIntArgSVF<ARG, DEFAULT_VALUE>>
    : public Brightness65535ScaleIntArgSVF<ARG, DEFAULT_VALUE> {};

template<int ARG, int DEFAULT_VALUE>
using Brightness65535ScaleIntArg = SingleValueAdapter<Brightness65535ScaleIntArgSVF<ARG, DEFAULT_VALUE>>;

#endif

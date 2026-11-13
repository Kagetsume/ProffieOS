#ifndef STYLES_COLOR_ALPHA_H
#define STYLES_COLOR_ALPHA_H

// Applies a config color's own alpha when that color is painted into the
// layer composite. Layer "opacity" is a separate multiplier in ConfigLayersStyle.

#include "../blade_style.h"
#include "parse_color_arg.h"

class ConfigColorAlphaStyle : public BladeStyle {
 public:
  ConfigColorAlphaStyle(BladeStyle* inner, const ConfigColorAlphaFrame& frame)
      : inner_(inner), n_(frame.n) {
    if (n_ > ConfigColorAlphaFrame::kMax) n_ = ConfigColorAlphaFrame::kMax;
    if (n_ < 0) n_ = 0;
    for (int i = 0; i < n_; i++) {
      rgb_[i] = frame.rgb[i];
      alpha_[i] = frame.alpha[i];
    }
  }

  ~ConfigColorAlphaStyle() override {
    delete inner_;
    inner_ = nullptr;
  }

  void activate() override { if (inner_) inner_->activate(); }
  void deactivate() override { if (inner_) inner_->deactivate(); }
  void run(BladeBase* blade) override { if (inner_) inner_->run(blade); }
  void runUpdate(BladeBase* blade) override { if (inner_) inner_->runUpdate(blade); }
  bool NoOnOff() override { return inner_ && inner_->NoOnOff(); }
  bool Charging() override { return inner_ && inner_->Charging(); }
  bool IsHandled(HandledFeature feature) override {
    return inner_ && inner_->IsHandled(feature);
  }
  OverDriveColor getColor(int led) override {
    return inner_ ? inner_->getColor(led) : OverDriveColor();
  }
  RGBA_um getLayerColor(int led) override {
    if (!inner_) return RGBA_um::Transparent();
    RGBA_um c = inner_->getLayerColor(led);
    ConfigColorAlphaApply(&c, rgb_, alpha_, n_);
    return c;
  }
  int get_max_arg(int arg) override { return inner_ ? inner_->get_max_arg(arg) : -1; }

 private:
  BladeStyle* inner_;
  Color16 rgb_[ConfigColorAlphaFrame::kMax];
  uint16_t alpha_[ConfigColorAlphaFrame::kMax];
  int n_;
};

// Active while one config layer style string is parsed. Nested parses stack.
class ConfigColorAlphaScope {
 public:
  ConfigColorAlphaScope() : prev_(ConfigColorAlphaFrameSlot()), closed_(false) {
    frame_.n = 0;
    ConfigColorAlphaFrameSlot() = &frame_;
  }
  ~ConfigColorAlphaScope() {
    if (!closed_) ConfigColorAlphaFrameSlot() = prev_;
  }
  BladeStyle* Wrap(BladeStyle* style) {
    if (!closed_) {
      ConfigColorAlphaFrameSlot() = prev_;
      closed_ = true;
    }
    if (!style || frame_.n <= 0) return style;
    BladeStyle* wrapped = new ConfigColorAlphaStyle(style, frame_);
    if (!wrapped) return style;
    return wrapped;
  }

 private:
  ConfigColorAlphaFrame frame_;
  ConfigColorAlphaFrame* prev_;
  bool closed_;
};

#endif

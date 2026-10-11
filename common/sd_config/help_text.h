#ifndef COMMON_HELP_TEXT_H
#define COMMON_HELP_TEXT_H

// SD config fork: opt-in named-style catalog blurbs in flash. Default: off (undefined).
//
// When enabled (define in CONFIG_TOP / your CONFIG_FILE):
//   - named_styles[] English descriptions (styles/style_parser.h)
//   - serial command describe_named_style (argument list still uses ArgParserPrinter)
//
// Style parsing, presets, and list_named_styles are unchanged when this is off.
//
//   #define ENABLE_CONFIG_FILE_HELP_TEXT

#ifdef ENABLE_CONFIG_FILE_HELP_TEXT
#define NAMED_STYLE_DESC(...) __VA_ARGS__
#else
#define NAMED_STYLE_DESC(...)
#endif

#endif  // COMMON_HELP_TEXT_H

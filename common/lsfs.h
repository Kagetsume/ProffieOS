#ifndef COMMON_LSFS_H
#define COMMON_LSFS_H

// Filesystem abstractions

#include <string.h>

#include "string_piece.h"

#ifdef F_MAXPATH
#define PO_MAXPATH F_MAXPATH
#elif ESP32
#define PO_MAXPATH 1024
#else
#define PO_MAXPATH 128
#endif


struct PathHelper {
  void Append(const char* name) {
    if (strlen(path_) && path_[strlen(path_)-1] != '/') {
      strcat(path_, "/");
    }
    strcat(path_, name);
  }
  void Append(const char* name, const char *ext) {
    if (strlen(path_) && path_[strlen(path_)-1] != '/') {
      strcat(path_, "/");
    }
    strcat(path_, name);
    strcat(path_, ".");
    strcat(path_, ext);
  }
  void Set(const char* path) {
    strcpy(path_, path ? path : "");
  }
  void Set(const char* path, const char* p2) {
    Set(path);
    Append(p2);
  }
  void Set(const char* path, const char* p2, const char* ext) {
    Set(path);
    Append(p2, ext);
  }
  explicit PathHelper(const char* path) {
    Set(path);
  }
  explicit PathHelper(const char* path, const char* p2) {
    Set(path, p2);
  }
  explicit PathHelper(const char* path, const char* p2, const char* ext) {
    Set(path, p2, ext);
  }
  bool IsRoot() const {
    if (path_[0] == 0) return true;
    if (path_[0] == '/' && path_[1] == 0) return true;
    return false;
  }
  bool Dirname() {
    char *p = strrchr(path_, '/');
    if (p) {
      *p = 0;
      return !IsRoot();
    }
    return false;
  }
  void UndoDirname() {
    path_[strlen(path_)] = '/';
  }

  void Slashify() {
    size_t len = strlen(path_);
    if (path_[len-1] == '/') return;
    path_[len] = '/';
    path_[len+1] = 0;
  }
  operator const char*() const { return path_; }
  operator StringPiece() const { return StringPiece(path_); }
  char path_[PO_MAXPATH];
};


#if defined(PROFFIE_TEST)

#include <sys/stat.h>
#include <unistd.h>
#include <dirent.h>
#include <fcntl.h>

#include "linked_ptr.h"
// Posix file primitives

class DoCloseFile {
public:
  static void Free(FILE* f) { if(f) fclose(f); }
};

class DoCloseDir {
public:
  static void Free(DIR* dir) { if(dir) closedir(dir); }
};

class File {
public:
  File() : file_() {}
  File(FILE* f) : file_(f) {}
  operator bool() const { return !!file_; }
  void close() { file_ = NULL; }
  int read(uint8_t *dest, size_t bytes) {
    return fread(dest, 1, bytes, file_.get());
  }
  int write(const uint8_t *dest, size_t bytes) {
    return fwrite(dest, 1, bytes, file_.get());
  }
  void seek(size_t pos) {
    fseek(file_.get(), pos, SEEK_SET);
  }
  uint32_t position() {
    return ftell(file_.get());
  }
  uint32_t available() {
    long pos = position();
    fseek(file_.get(), 0, SEEK_END);
    long end = position();
    seek(pos);
    return end - pos;
  }
  uint32_t size() {
    long pos = position();
    fseek(file_.get(), 0, SEEK_END);
    long end = position();
    seek(pos);
    return end;
  }
  int peek() {
    long pos = position();
    uint8_t ret;
    read(&ret, 1);
    seek(pos);
    return ret;
  }
  LinkedPtr<FILE, DoCloseFile> file_;
};


class LSFS {
public:
  typedef File LSFILE;
  static bool Begin() { return true; }
  static bool End() { return true; }
  static bool Exists(const char* path) {
    struct stat s;
    return stat(path, &s) == 0;
  }
  static bool Remove(const char* path) {
    return unlink(path) == 0;
  }
  static File Open(const char* path) {
    return fopen(path, "r");
  }
  static File OpenRW(const char* path) {
    File ret = fopen(path, "r+");
    if (ret) return ret;
    return OpenForWrite(path);
  }
  static File OpenFast(const char* path) {
    return fopen(path, "r");
  }
  static File OpenForWrite(const char* path) {
    return fopen(path, "wct");
  }
  class Iterator {
  public:
    explicit Iterator(const char* dirname) {
      dir_ = opendir(dirname);
      entry_ = readdir(dir_.get());
    }
    explicit Iterator(Iterator& other) {
      if (other.dir_) {
	dir_ = fdopendir(openat(dirfd(other.dir_.get()),
				other.entry_->d_name,
				O_RDONLY));
	entry_ = readdir(dir_.get());
      }
    }
    void operator++() {
      entry_ = readdir(dir_.get());
    }
    bool isdir() {
      struct stat s;
      if (!strcmp(entry_->d_name, ".")) return false;
      if (!strcmp(entry_->d_name, "..")) return false;
      if (fstatat(dirfd(dir_.get()), entry_->d_name, &s, 0) != 0) return false;
      return S_ISDIR(s.st_mode);
    }
    operator bool() { return !!entry_; }
    // bool isdir() { return f_.isDirectory(); }
    const char* name() { return entry_->d_name; }
    // size_t size() { return f_.size(); }
    
  private:
    LinkedPtr<DIR, DoCloseDir> dir_;
    dirent* entry_;
  };
};

#elif defined(TEENSYDUINO)

#include <SD.h>

class LSFS {
public:
  typedef File LSFILE;
  static bool Begin() {
#if defined(__MK64FX512__) || defined(__MK66FX1M0__)
    // Prefer the built-in sd card for Teensy 3.5/3.6 as it is faster.
    return SD.begin(BUILTIN_SDCARD);
#else 
    return SD.begin(sdCardSelectPin);
#endif    
  }
  static bool End() {
    return true;
  }
  static bool Exists(const char* path) {
    return SD.exists(path);
  }
  static bool Remove(const char* path) {
    return SD.remove(path);
  }
  static File Open(const char* path) {
    if (!SD.exists(path)) return File();
    return SD.open(path);
  }
  static File OpenRW(const char* path) {
    return SD.open(path, FILE_WRITE);
  }
  static File OpenFast(const char* path) {
    // At some point, I put this check in here to make sure that the file
    // exists before we try to open it, as opening directories and other
    // weird files can cause open() to hang. However, this check takes
    // too long, and causes audio underflows, so we're going to need a
    // different approach to not opening directories and weird files. /Hubbe
    // if (!SD.exists(path)) return File();
    return SD.open(path);
  }
  static File OpenForWrite(const char* path) {
    File f =  SD.open(path, FILE_WRITE);
    if (!f) {
      PathHelper tmp(path);
      if (tmp.Dirname()) {
	SD.mkdir(tmp);
	f =  SD.open(path, FILE_WRITE);
      }
    }
    return f;
  }
  class Iterator {
  public:
    explicit Iterator(const char* dirname) {
      dir_ = SD.open(dirname);
      if (dir_.isDirectory()) {
	f_ = dir_.openNextFile();
      }
    }
    explicit Iterator(Iterator& other) {
      dir_ = other.f_;
      other.f_ = File();
      f_ = dir_.openNextFile();
    }
    ~Iterator() {
      dir_.close();
      f_.close();
    }
    void operator++() {
      f_.close();
      f_ = dir_.openNextFile();
    }
    operator bool() { return f_; }
    bool isdir() { return f_.isDirectory(); }
    const char* name() { return f_.name(); }
    size_t size() { return f_.size(); }
    
  private:
    File dir_;
    File f_;
  };
};
#elif defined(ARDUINO_ARCH_STM32L4)

#include <FS.h>

// Workaround for badly named variable
#define private c_private
#include <dosfs_core.h>
#undef private

class LSFS {
public:
  typedef File LSFILE;
  static bool IsMounted() {
    return mounted_;
  }
  static bool CanMount() {
    // dosfs_volume_t *volume = DOSFS_DEFAULT_VOLUME();
    dosfs_device_t *device = DOSFS_VOLUME_DEVICE(volume);
    if (device->lock & (DOSFS_DEVICE_LOCK_VOLUME |
			DOSFS_DEVICE_LOCK_SCSI |
			DOSFS_DEVICE_LOCK_MEDIUM |
			DOSFS_DEVICE_LOCK_INIT)) return false;
    return true;
  }
  static void SetAllowMount(bool allow) {
    dosfs_device_t *device = DOSFS_VOLUME_DEVICE(volume);
    if (allow) {
      device->lock &=~ DOSFS_DEVICE_LOCK_EJECTED;
    } else {
      device->lock |= DOSFS_DEVICE_LOCK_EJECTED;
    }
  }
  static bool GetAllowMount() {
    dosfs_device_t *device = DOSFS_VOLUME_DEVICE(volume);
    return (device->lock & DOSFS_DEVICE_LOCK_EJECTED) == 0;
  }
  static void WhyBusy(char *tmp) {
    *tmp = 0;
    // dosfs_volume_t *volume = DOSFS_DEFAULT_VOLUME();
    dosfs_device_t *device = DOSFS_VOLUME_DEVICE(volume);
    if (device->lock & DOSFS_DEVICE_LOCK_VOLUME)
      strcat(tmp, " volume");
    if (device->lock & DOSFS_DEVICE_LOCK_SCSI)
      strcat(tmp, " scsi");
    if (device->lock & DOSFS_DEVICE_LOCK_MEDIUM)
      strcat(tmp, " medium");
    if (device->lock & DOSFS_DEVICE_LOCK_INIT)
      strcat(tmp, " init");
  }
  // This function waits until the volume is mounted.
  static bool Begin() {
    if (mounted_) return true;
#ifdef VERBOSE_SD_ERRORS
    int error = f_initvolume();
    if (error != F_NO_ERROR) {
      STDERR << "SD init error: " << error << "\n";
      extern void SaySDInitError(int error);
      SaySDInitError(error);
      return false;
    }
    error = f_checkvolume();
    if (error != F_NO_ERROR) {
      STDERR << "SD check error: " << error << "\n";
      extern void SaySDCheckError(int error);
      SaySDCheckError(error);
      DOSFS.end();
      return false;
    }
#else    
    if (!DOSFS.begin()) return false;
    if (!DOSFS.check()) {
      DOSFS.end();
      return false;
    }
#endif    
    return mounted_ = true;
  }
  static void End() {
    if (!mounted_) return;
    DOSFS.end();
    mounted_ = false;
  }
  static bool Exists(const char* path) {
    if (!mounted_) return false;
    return DOSFS.exists(path);
  }
  static bool Remove(const char* path) {
    if (!mounted_) return false;
    return DOSFS.remove(path);
  }
  static File Open(const char* path) {
    if (!mounted_) return File();
    return DOSFS.open(path, "r");
  }
  static File OpenRW(const char* path) {
    if (!mounted_) return File();
    File f = DOSFS.open(path, "r+");
    if (!f) f = OpenForWrite(path);
    return f;
  }
  static File OpenFast(const char* path) {
    if (!mounted_) return File();
    return DOSFS.open(path, "r");
  }
  static void mkdir(PathHelper& p) {
    if (!mounted_) return;
    if (p.Dirname()) {
      mkdir(p);
      p.UndoDirname();
    }
    DOSFS.mkdir(p);
  }
  static File OpenForWrite(const char* path) {
    if (!mounted_) return File();
    File f = DOSFS.open(path, "w");
    if (!f) {
      PathHelper tmp(path);
      if (tmp.Dirname()) {
	mkdir(tmp);
	f = DOSFS.open(path, "w");
      }
    }
    return f;
  }
  class Iterator {
  public:
    explicit Iterator(const char* path) {

      strcpy(_path, path);

      if (path[strlen(path)-1] != '/')  
        strcat(_path, "/");

      PathHelper filename(_path, "*.*");
      if (!mounted_ || f_findfirst(filename, &_find) != F_NO_ERROR) {
        _find.find_clsno = 0x0fffffff;
      }
    }
    explicit Iterator(Iterator& other) {
      strcpy(_path, other._path);
      strcat(_path, other.name());

      if (_path[strlen(_path)-1] != '/')  
        strcat(_path, "/");

      PathHelper filename(_path, "*.*");
      if (!mounted_ || f_findfirst(filename, &_find) != F_NO_ERROR) {
        _find.find_clsno = 0x0fffffff;
      }
    }

    void operator++() {
      if (!mounted_ || f_findnext(&_find) != F_NO_ERROR) {
        _find.find_clsno = 0x0fffffff;
      }
    }
    operator bool() { return _find.find_clsno != 0x0fffffff; }
    bool isdir() { return _find.attr & F_ATTR_DIR; }
    const char* name() { return _find.filename; }
    size_t size() { return _find.filesize; }
    
  private:
    char _path[F_MAXPATH];
    F_FIND _find;
  };
private:
  static bool mounted_;
};

bool LSFS::mounted_ = false;
#elif defined(ESP32)

#include <sys/stat.h>
#include <unistd.h>
#include <dirent.h>
#include <fcntl.h>

#include "FS.h"
#include "SD_MMC.h"
#include "SD.h"

#include "linked_ptr.h"
// Posix file primitives

class DoCloseFile {
public:
  static void Free(FILE* f) { if(f) fclose(f); }
};

class DoCloseDir {
public:
  static void Free(DIR* dir) { if(dir) closedir(dir); }
};

class LSFS {
public:

  class File : public Stream {
  public:
    File() : file_() {}
    File(FILE* f) : file_(f) {
      if (file_.get()) {
	setvbuf(file_.get(), NULL, _IOFBF, 512);
      }
    }
    operator bool() const { return !!file_; }
    void close() { file_ = NULL; }
    int read(uint8_t *dest, size_t bytes) {
      return fread(dest, 1, bytes, file_.get());
    }
    int read() {
      uint8_t c;
      read(&c, 1);
      return c;
    }
    size_t write(const uint8_t *dest, size_t bytes) override {
      return fwrite(dest, 1, bytes, file_.get());
    }
    size_t write(uint8_t c) override {
      return write(&c, 1);
    }
    void seek(size_t pos) {
      fseek(file_.get(), pos, SEEK_SET);
    }
    uint32_t position() {
      return ftell(file_.get());
    }
    // Warning: slow!
    int available() {
      long pos = position();
      fseek(file_.get(), 0, SEEK_END);
      long end = position();
      seek(pos);
      return end - pos;
    }
    // Warning: slow!
    uint32_t size() {
      long pos = position();
      fseek(file_.get(), 0, SEEK_END);
      long end = position();
      seek(pos);
      return end;
    }
    // Warning: slow!
    int peek() {
      long pos = position();
      uint8_t ret;
      read(&ret, 1);
      seek(pos);
      return ret;
    }
    LinkedPtr<FILE, DoCloseFile> file_;
  };

  typedef File LSFILE;

  static bool Begin() {

#if 1
#define SDCLASS SD_MMC
    SD_MMC.setPins(sdClkPin, sdCmdPin, sdD0Pin, sdD1Pin, sdD2Pin, sdD3Pin);
//    if (!SD_MMC.begin("/sdcard", false, false, SDMMC_FREQ_DEFAULT, /*maxOpenFiles=*/ 32)) return false;
    if (!SD_MMC.begin("/sdcard", false, false, BOARD_MAX_SDMMC_FREQ, /*maxOpenFiles=*/ 32)) return false;

    chdir("/sdcard");
#endif

    
#if 0
#define SDCLASS SD
    SPI.begin(sdClkPin, sdD0Pin, sdCmdPin);
    if (!SD.begin(sdD3Pin, SPI, /* frequency= */ 20000000, "/sd" , /* max_file=*/ 32)) return false;
#endif

    
//    if (!SDCLASS.begin()) return false;
    uint8_t cardType = SDCLASS.cardType();
    if (cardType == CARD_NONE) return false;
    return true;
  }
  static bool End() {
    SDCLASS.end();
    return true;
  }
  static bool Exists(const char* path) {
    PathHelper p("/sdcard", path);
    struct stat s;
    return stat(p, &s) == 0;
    
    // return SDCLASS.exists(path);
  }
  static bool Remove(const char* path) {
    return unlink(path) == 0;
    // return SDCLASS.remove(path);
  }
  static File Open(const char* path) {
    PathHelper p("/sdcard", path);
    return fopen(p, "r");
  }
  static File OpenRW(const char* path) {
    PathHelper p("/sdcard", path);
    File ret = fopen(p, "r+");
    if (ret) return ret;
    return OpenForWrite(p);
  }
  static File OpenFast(const char* path) {
    PathHelper p("/sdcard", path);
    return fopen(p, "r");
  }
  static File OpenForWrite(const char* path) {
    PathHelper p("/sdcard", path);
    return fopen(p, "wct");
  }

  class Iterator {
  public:
    explicit Iterator(const char* path) : path_("/sdcard", path) {
      path_.Slashify();

      dir_ = opendir(path_);
      if (dir_.get() == nullptr) {
	entry_ = nullptr;
	return;
      }
      entry_ = readdir(dir_.get());
    }

    explicit Iterator(Iterator& other) : path_(other.path_, other.name()) {
      path_.Slashify();
      
      dir_ = opendir(path_);
      if (!dir_) {
	STDERR << "Expected path does not exist: " << path_ << "\n";
	entry_ = nullptr;
	return;
      }
      entry_ = readdir(dir_.get());
    }

    void operator++() { entry_ = readdir(dir_.get()); }
    operator bool() { return !!entry_; }
    bool isdir() {
      struct stat s;
      PathHelper filename(path_, entry_->d_name);
      stat(filename, &s);
      return S_ISDIR(s.st_mode);
    }
    const char* name() { return entry_->d_name; }
    size_t size() {
      struct stat s;
      PathHelper filename(path_, entry_->d_name);
      stat(filename, &s);
      return s.st_size;
    }
    
  private:
    PathHelper path_;
    LinkedPtr<DIR, DoCloseDir> dir_;
    dirent* entry_;
  };
};


#else

// Standard arduino
#include <SD.h>

class LSFS {
public:
  typedef File LSFILE;
  static bool Begin() {
    return SD.begin(sdCardSelectPin);
  }
  static bool End() {
    return true;
  }
  static bool Exists(const char* path) {
    return SD.exists(path);
  }
  static bool Remove(const char* path) {
    return SD.remove(path);
  }
  static File Open(const char* path) {
    if (!SD.exists(path)) return File();
    return SD.open(path);
  }
  static File OpenRW(const char* path) {
    return SD.open(path, FILE_WRITE);
  }
  static File OpenFast(const char* path) {
    // At some point, I put this check in here to make sure that the file
    // exists before we try to open it, as opening directories and other
    // weird files can cause open() to hang. However, this check takes
    // too long, and causes audio underflows, so we're going to need a
    // different approach to not opening directories and weird files. /Hubbe
    // if (!SD.exists(path)) return File();
    return SD.open(path);
  }
  static File OpenForWrite(const char* path) {
    File f =  SD.open(path, FILE_WRITE);
    if (!f) {
      PathHelper tmp(path);
      if (tmp.Dirname()) {
	SD.mkdir(tmp);
	f =  SD.open(path, FILE_WRITE);
      }
    }
    return f;
  }
  class Iterator {
  public:
    explicit Iterator(const char* dirname) {
      dir_ = SD.open(dirname);
      if (dir_.isDirectory()) {
	f_ = dir_.openNextFile();
      }
    }
    explicit Iterator(Iterator& other) {
      dir_ = other.f_;
      other.f_ = File();
      f_ = dir_.openNextFile();
    }
    ~Iterator() {
      dir_.close();
      f_.close();
    }
    void operator++() {
      f_.close();
      f_ = dir_.openNextFile();
    }
    operator bool() { return f_; }
    bool isdir() { return f_.isDirectory(); }
    const char* name() { return f_.name(); }
    size_t size() { return f_.size(); }
    
  private:
    File dir_;
    File f_;
  };
};
#endif

#endif

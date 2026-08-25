#!/usr/bin/env python3
"""
Confirms a downloaded file is a real image, and reports what it is.

The asset-ingestion workflow fetches a URL and commits the bytes. A CDN that
answers with an HTML error page, an S3 XML fault document, or an expired-link
notice still returns bytes, and those bytes would otherwise be committed under
an image filename and only discovered much later — inside a generation, or as a
broken plate. So the format is decided by the file's own leading bytes rather
than by its extension, its URL, or the Content-Type header a server claimed.

Dimensions are parsed straight from the container headers. That keeps this
dependency-free, which matters on a runner: no pip install, nothing to pin, and
nothing that can start failing because a wheel moved.

Usage:  verify-image.py <path>
Prints one JSON object on success; on failure explains what arrived instead and
exits non-zero.
"""
import json
import struct
import sys
from pathlib import Path

SUPPORTED = "PNG, JPEG, WebP or GIF"


class NotAnImage(Exception):
    """The bytes are not a supported image; the message says what they are."""


def _describe_text(head: bytes) -> str:
    """Name what arrived, when what arrived is plainly not an image."""
    sample = head[:200].decode("utf-8", "replace").strip()
    lowered = sample.lower()
    if lowered.startswith("<?xml") or "<error>" in lowered:
        return f"an XML document, most likely a storage error response: {sample[:120]!r}"
    if lowered.startswith("<!doctype html") or lowered.startswith("<html"):
        return f"an HTML page, most likely an error or expired-link page: {sample[:120]!r}"
    if lowered.startswith("{"):
        return f"a JSON document, most likely an API error: {sample[:120]!r}"
    return f"not a supported image (first bytes: {head[:16].hex(' ')})"


def _png(data: bytes) -> tuple[int, int]:
    if len(data) < 24 or data[12:16] != b"IHDR":
        raise NotAnImage("PNG signature present but the IHDR header is missing or truncated")
    return struct.unpack(">II", data[16:24])


def _gif(data: bytes) -> tuple[int, int]:
    if len(data) < 10:
        raise NotAnImage("GIF signature present but the header is truncated")
    return struct.unpack("<HH", data[6:10])


def _jpeg(data: bytes) -> tuple[int, int]:
    """Walk the marker chain to the frame header that carries the size."""
    # SOF0-3, 5-7, 9-11, 13-15 carry dimensions. DHT/DAC/RST/SOS do not.
    size_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                    0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    offset = 2
    end = len(data)
    while offset + 4 <= end:
        if data[offset] != 0xFF:
            raise NotAnImage("JPEG marker chain is corrupt")
        marker = data[offset + 1]
        # Padding and standalone markers carry no length field.
        if marker == 0xFF:
            offset += 1
            continue
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            offset += 2
            continue
        if offset + 4 > end:
            break
        length = struct.unpack(">H", data[offset + 2:offset + 4])[0]
        if marker in size_markers:
            if offset + 9 > end:
                raise NotAnImage("JPEG frame header is truncated")
            height, width = struct.unpack(">HH", data[offset + 5:offset + 9])
            return width, height
        if marker == 0xDA:  # start of scan: no size header was found
            break
        offset += 2 + length
    raise NotAnImage("JPEG contains no frame header, so it has no readable dimensions")


def _webp(data: bytes) -> tuple[int, int]:
    if len(data) < 30:
        raise NotAnImage("WebP signature present but the header is truncated")
    chunk = data[12:16]
    if chunk == b"VP8X":
        width = int.from_bytes(data[24:27], "little") + 1
        height = int.from_bytes(data[27:30], "little") + 1
        return width, height
    if chunk == b"VP8 ":
        if data[23:26] != b"\x9d\x01\x2a":
            raise NotAnImage("WebP lossy frame is missing its sync code")
        width = struct.unpack("<H", data[26:28])[0] & 0x3FFF
        height = struct.unpack("<H", data[28:30])[0] & 0x3FFF
        return width, height
    if chunk == b"VP8L":
        if data[20] != 0x2F:
            raise NotAnImage("WebP lossless frame is missing its signature byte")
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    raise NotAnImage(f"WebP container holds an unrecognised chunk {chunk!r}")


def _check_complete(mime: str, data: bytes) -> None:
    """
    Reject a file whose header is fine but whose body was cut short.

    A dimension header sits in the first few dozen bytes, so a download that
    dies halfway still reports a perfectly plausible size. Every one of these
    containers marks its own end, and a truncated transfer is a realistic
    failure — a dropped connection, a proxy timeout — so the terminator is
    checked rather than assumed.
    """
    if mime == "image/png":
        # ...IEND + CRC are the final eight bytes of a complete PNG.
        if data[-8:-4] != b"IEND":
            raise NotAnImage("a PNG whose IEND marker is missing — the download was truncated")
    elif mime == "image/jpeg":
        if data[-2:] != b"\xff\xd9":
            raise NotAnImage("a JPEG whose end-of-image marker is missing — the download was truncated")
    elif mime == "image/gif":
        if data[-1:] != b"\x3b":
            raise NotAnImage("a GIF whose trailer is missing — the download was truncated")
    elif mime == "image/webp":
        # The RIFF header states the payload length; anything shorter is partial.
        declared = struct.unpack("<I", data[4:8])[0] + 8
        if len(data) < declared:
            raise NotAnImage(
                f"a WebP declaring {declared} bytes but holding {len(data)} — the download was truncated"
            )


def inspect(path: Path) -> dict:
    data = path.read_bytes()
    if not data:
        raise NotAnImage("the file is empty — nothing was downloaded")

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime, (width, height) = "image/png", _png(data)
    elif data.startswith(b"\xff\xd8\xff"):
        mime, (width, height) = "image/jpeg", _jpeg(data)
    elif data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        mime, (width, height) = "image/webp", _webp(data)
    elif data.startswith((b"GIF87a", b"GIF89a")):
        mime, (width, height) = "image/gif", _gif(data)
    else:
        raise NotAnImage(_describe_text(data))

    if width <= 0 or height <= 0:
        raise NotAnImage(f"decoded an impossible size of {width}x{height}")

    _check_complete(mime, data)

    return {
        "mime": mime,
        "width": width,
        "height": height,
        "bytes": len(data),
        "megapixels": round(width * height / 1_000_000, 2),
        "aspect": round(width / height, 4),
    }


EXTENSIONS = {
    "image/png": {".png"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/webp": {".webp"},
    "image/gif": {".gif"},
}


def summarise(info: dict) -> str:
    return (
        f"{info['mime']}, {info['width']}x{info['height']} "
        f"({info['megapixels']} MP), aspect {info['aspect']}, {info['bytes']:,} bytes"
    )


def main() -> int:
    if not 2 <= len(sys.argv) <= 3:
        print("usage: verify-image.py <path> [destination-name]", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"no file at {path}", file=sys.stderr)
        return 1

    try:
        info = inspect(path)
    except NotAnImage as problem:
        print(
            f"{path} is not a usable image.\n"
            f"  Expected {SUPPORTED}; found {problem}",
            file=sys.stderr,
        )
        return 1

    # An extension that disagrees with the bytes is the same defect the
    # reference frames arrived with, and it is worth refusing at the door
    # rather than discovering later inside a generation.
    if len(sys.argv) == 3:
        suffix = Path(sys.argv[2]).suffix.lower()
        allowed = EXTENSIONS[info["mime"]]
        if suffix not in allowed:
            print(
                f"The bytes are {info['mime']} but the destination ends in "
                f"'{suffix or '(none)'}'.\n"
                f"  Rename it to {' or '.join(sorted(allowed))} so the extension "
                f"tells the truth about the file.",
                file=sys.stderr,
            )
            return 1

    print(summarise(info))
    print(json.dumps(info), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Edge-TTS 桥接脚本 — 单段合成，长文本分段由 Node.js 侧处理"""
import sys
import subprocess


def main():
    if len(sys.argv) != 4:
        print("Usage: tts_bridge.py <input.txt> <voice_id> <output.mp3>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    voice_id = sys.argv[2]
    output_path = sys.argv[3]

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        if not text:
            print("Error: empty input text", file=sys.stderr)
            sys.exit(1)
    except FileNotFoundError:
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        [
            sys.executable, "-m", "edge_tts",
            "--voice", voice_id,
            "--text", text,
            "--write-media", output_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    print(f"TTS done: {output_path}")


if __name__ == "__main__":
    main()

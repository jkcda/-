#!/usr/bin/env python3
"""Edge-TTS 桥接脚本 — 供 Node.js 后端调用"""
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

    # 文本太长时分段合成再拼接
    MAX_CHARS = 2000
    if len(text) <= MAX_CHARS:
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
    else:
        # 分段合成，用 concat protocol 拼接
        import os
        import tempfile

        filelist_path = os.path.join(
            tempfile.mkdtemp(prefix="tts_seg_"), "files.txt"
        )
        chunks = []
        for i in range(0, len(text), MAX_CHARS):
            chunk = text[i : i + MAX_CHARS]
            seg_path = os.path.join(
                os.path.dirname(output_path), f"seg_{i:04d}.mp3"
            )
            chunks.append(seg_path)
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "edge_tts",
                    "--voice",
                    voice_id,
                    "--text",
                    chunk,
                    "--write-media",
                    seg_path,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode != 0:
                print(result.stderr, file=sys.stderr)
                sys.exit(result.returncode)

        with open(filelist_path, "w") as f:
            for seg in chunks:
                f.write(f"file '{seg}'\n")

        concat_result = subprocess.run(
            [
                "ffmpeg",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                filelist_path,
                "-c",
                "copy",
                output_path,
                "-y",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        # 清理分段文件
        for seg in chunks:
            try:
                os.remove(seg)
            except OSError:
                pass
        try:
            os.remove(filelist_path)
        except OSError:
            pass

        if concat_result.returncode != 0:
            print(concat_result.stderr, file=sys.stderr)
            sys.exit(concat_result.returncode)

    print(f"TTS done: {output_path}")


if __name__ == "__main__":
    main()

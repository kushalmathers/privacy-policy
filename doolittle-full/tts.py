import json, sys, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel

# usage: python tts.py lines.json  ->  writes audio/<id>.wav + audio/meta.json
LINES = json.load(open(sys.argv[1]))

# bf16 keeps the 1.7B model under ~4 GB on CPU; float32 OOM-kills an 8 GB box
torch.set_num_threads(2)
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", device_map="cpu",
    dtype=torch.bfloat16, low_cpu_mem_usage=True,
)
print("MODEL_LOADED", flush=True)
meta = {}
for name, text in LINES:
    wavs, sr = model.generate_custom_voice(
        text=text, language="English", speaker="Ryan",
        instruct="Speak slowly and clearly, in a deep, calm, awe-struck documentary narrator voice.",
    )
    sf.write(f"audio/{name}.wav", wavs[0], sr)
    meta[name] = {"text": text, "duration": round(len(wavs[0]) / sr, 3)}
    print(name, meta[name]["duration"], flush=True)
json.dump(meta, open("audio/meta.json", "w"), indent=2)
print("TTS_DONE", flush=True)

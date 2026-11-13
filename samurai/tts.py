import json, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel

LINES = [
    ("intro", "In the age of warring states, a lone samurai walked the path of the sword."),
    ("dawn",  "At dawn, beneath the crimson sky, he drew his blade and faced the silence."),
    ("duel",  "Steel met steel. Every strike was a lifetime of discipline, every breath a vow."),
    ("end",   "When the dust settled, only honor remained. The way of the warrior endures."),
]

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
        instruct="Speak slowly, in a deep, calm, dramatic narrator voice.",
    )
    sf.write(f"audio/{name}.wav", wavs[0], sr)
    meta[name] = {"text": text, "duration": round(len(wavs[0]) / sr, 3)}
    print(name, meta[name]["duration"], flush=True)
json.dump(meta, open("audio/meta.json", "w"), indent=2)
print("TTS_DONE", flush=True)

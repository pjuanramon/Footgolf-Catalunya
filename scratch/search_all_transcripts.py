import os, json

brain = r'C:\Users\pjuan\.gemini\antigravity\brain'
keywords = ['cabeza de serie', 'cabezas de serie', 'bombo', 'semillero', 'cabezas']

for root, dirs, files in os.walk(brain):
    for f in files:
        if f == 'transcript.jsonl':
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                for line in fp:
                    try:
                        obj = json.loads(line)
                        content = obj.get('content', '')
                        if any(k in content.lower() for k in keywords):
                            conv_id = root.split(os.sep)[-3] if 'logs' in root else os.path.basename(root)
                            print(f'[{conv_id}] Step {obj.get("step_index")}:')
                            for c_line in content.split('\n'):
                                if any(k in c_line.lower() for k in keywords):
                                    print('   ', c_line.strip()[:140])
                    except:
                        pass
